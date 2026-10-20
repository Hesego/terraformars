import { Injectable, Logger } from '@nestjs/common';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export interface TerraformResult {
    success: boolean;
    output: string;
    resources?: any[];
    error?: string;
}

@Injectable()
export class TerraformService {
    private readonly logger = new Logger(TerraformService.name);

    async executeDeployment(
        terraformCode: string,
        variables: Record<string, any>,
        azureCredentials: {
            clientId: string;
            clientSecret: string;
            tenantId: string;
            subscriptionId: string;
        },
        scripts?: Array<{ name: string, content: string, language: string }>,
        onLog?: (chunk: string) => void
    ): Promise<TerraformResult> {
        const workDir = path.join(os.tmpdir(), `terraform-${Date.now()}`);

        try {
            await fs.ensureDir(workDir);

            // Clean code (remove markdown code blocks if present)
            let cleanedCode = this.cleanTerraformCode(terraformCode);

            // 1. Remove ANY existing provider blocks from the AI code to avoid conflicts
            const codeWithoutProviders = this.stripProviderBlocks(cleanedCode);

            // 2. Inject Scripts if provided
            const codeWithScripts = scripts && scripts.length > 0 
                ? this.injectScripts(codeWithoutProviders, scripts)
                : codeWithoutProviders;

            // 3. Add our single, clean, guaranteed provider block at the top
            const finalCode = `
provider "azurerm" {
  features {}
  resource_provider_registrations = "none"
}

${codeWithScripts}`;

            // Security: Don't log full HCL in production, only size and type
            this.logger.log(`Executing Terraform for ${workDir} (HCL Size: ${finalCode.length} bytes)`);
            await fs.writeFile(path.join(workDir, 'main.tf'), finalCode);

            // ... rest of the method stays the same ...

            // Create terraform.tfvars
            const varContent = Object.entries(variables)
                .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
                .join('\n');
            await fs.writeFile(path.join(workDir, 'terraform.tfvars'), varContent);

            // Setup Environment Variables for Azure
            const env: any = {
                ...process.env,
                ARM_CLIENT_ID: azureCredentials.clientId.trim(),
                ARM_CLIENT_SECRET: azureCredentials.clientSecret.trim(),
                ARM_SUBSCRIPTION_ID: azureCredentials.subscriptionId.trim(),
                ARM_TENANT_ID: azureCredentials.tenantId.trim(),
            };

            // Explicitly remove deprecated/conflicting env vars
            delete env.ARM_SKIP_PROVIDER_REGISTRATION;

            const options = {
                cwd: workDir,
                env,
                maxBuffer: 1024 * 1024 * 50 // 50MB buffer to prevent stdout maxBuffer exceeded
            };
            let fullOutput = '';
            const run = async (cmd: string, args: string[], tag: string) => {
                if (onLog) onLog(`\n--- ${tag} ---\n`);
                const res = await this.runCommandStream(cmd, args, options, onLog);
                fullOutput += `--- ${tag} ---\n${res.stdout}\n${res.stderr}\n`;
                if (res.code !== 0) {
                    throw { message: `${tag} failed with code ${res.code}`, stdout: res.stdout, stderr: res.stderr };
                }
                return res;
            };

            this.logger.log(`Running terraform init in ${workDir}`);
            await run('terraform', ['init', '-no-color', '-input=false'], 'INIT');

            this.logger.log(`Running terraform plan in ${workDir}`);
            await run('terraform', ['plan', '-no-color', '-input=false'], 'PLAN');

            this.logger.log(`Running terraform apply in ${workDir}`);
            await run('terraform', ['apply', '-auto-approve', '-no-color', '-input=false'], 'APPLY');

            // 6. Capture State Information (Resources)
            this.logger.log(`Capturing state in ${workDir}`);
            const stateRes = await this.runCommandStream('terraform', ['show', '-json'], options);
            const resources = this.parseResources(stateRes.stdout);

            return { 
                success: true, 
                output: this.sanitizeOutput(fullOutput),
                resources
            };
        } catch (error) {
            this.logger.error(`Terraform execution failed: ${error.message}`);
            const combinedOutput = `${error.stdout || ''}\n${error.stderr || ''}`;
            return {
                success: false,
                output: combinedOutput.trim() || error.message,
                error: error.message || error.stderr,
            };
        } finally {
            // Small delay to ensure files are closed before cleanup
            setTimeout(() => fs.remove(workDir).catch(() => { }), 10000);
        }
    }

    private async runCommandStream(
        command: string,
        args: string[],
        options: any,
        onLog?: (chunk: string) => void
    ): Promise<{ stdout: string; stderr: string; code: number | null }> {
        return new Promise((resolve, reject) => {
            const child = spawn(command, args, options);
            let stdout = '';
            let stderr = '';

            child.stdout.on('data', (data) => {
                const chunk = data.toString();
                stdout += chunk;
                if (onLog) onLog(chunk);
            });

            child.stderr.on('data', (data) => {
                const chunk = data.toString();
                stderr += chunk;
                if (onLog) onLog(chunk);
            });

            child.on('close', (code) => {
                resolve({ stdout, stderr, code });
            });

            child.on('error', (err) => {
                reject(err);
            });
        });
    }

    private sanitizeOutput(output: string): string {
        if (!output) return '';
        // Hide potential secrets in output (rough filter)
        return output
            .replace(/ARM_CLIENT_SECRET\s*=\s*[^\s]+/gi, 'ARM_CLIENT_SECRET = <REDACTED>')
            .replace(/client_secret\s*=\s*[^\s]+/gi, 'client_secret = <REDACTED>')
            .replace(/password\s*=\s*[^\s]+/gi, 'password = <REDACTED>');
    }

    private cleanTerraformCode(code: string): string {
        const regex = /```(?:hcl|terraform)?\n?([\s\S]*?)```/g;
        let match;
        let cleanedCode = '';
        let found = false;

        while ((match = regex.exec(code)) !== null) {
            cleanedCode += match[1] + '\n';
            found = true;
        }

        return found ? cleanedCode.trim() : code.trim();
    }

    private stripProviderBlocks(code: string): string {
        let currentCode = code;

        // 1. Remove all azurerm provider blocks using robust brace counting
        const providerRegex = /provider\s+["']?azurerm["']?\s+\{/gi;
        while (true) {
            const match = providerRegex.exec(currentCode);
            if (!match) break;

            const startIdx = match.index;
            let braceCount = 1;
            let i = startIdx + match[0].length;
            let endIdx = -1;

            while (i < currentCode.length && braceCount > 0) {
                if (currentCode[i] === '{') braceCount++;
                else if (currentCode[i] === '}') braceCount--;
                i++;
            }

            if (braceCount === 0) {
                endIdx = i;
                currentCode = currentCode.substring(0, startIdx) + currentCode.substring(endIdx);
                providerRegex.lastIndex = 0;
            } else {
                currentCode = currentCode.substring(0, startIdx) + currentCode.substring(startIdx + match[0].length);
                providerRegex.lastIndex = 0;
            }
        }

        // 2. Remove individual conflicting provider attributes
        const lines = currentCode.split('\n');
        const processedLines = lines.filter(line => {
            const l = line.toLowerCase();
            return !(
                l.includes('resource_provider_registrations') ||
                l.includes('skip_provider_registration') ||
                l.includes('provider "azurerm"') ||
                l.includes('features {') ||
                l.trim() === 'features {}'
            );
        });

        this.logger.debug(`StripProviderBlocks: Input code length: ${code.length}`);
        let sanitizedCode = processedLines.join('\n');

        // 3. SANITIZE RESOURCE BLOCKS (VM & AKS)
        // We visit each resource block exactly once to avoid infinite loops
        const resourceHeaderRegex = /resource\s+["'](azurerm_(?:linux_virtual_machine|windows_virtual_machine|kubernetes_cluster|postgresql_flexible_server|storage_account|key_vault))["']\s+["'][^"']+["']\s+\{/gi;

        let rMatch;
        while ((rMatch = resourceHeaderRegex.exec(sanitizedCode)) !== null) {
            const resourceType = rMatch[1];
            const startIdx = rMatch.index;
            const bodyStartIdx = startIdx + rMatch[0].length;

            let braceCount = 1;
            let i = bodyStartIdx;
            while (i < sanitizedCode.length && braceCount > 0) {
                if (sanitizedCode[i] === '{') braceCount++;
                else if (sanitizedCode[i] === '}') braceCount--;
                i++;
            }

            if (braceCount === 0) {
                const endIdx = i;
                const body = sanitizedCode.substring(bodyStartIdx, endIdx - 1);
                let cleanedBody = body;

                if (resourceType.includes('virtual_machine')) {
                    // Fix VM naming constraints
                    cleanedBody = cleanedBody.split('\n').map(l => {
                        const trimmed = l.trim().toLowerCase();
                        if (trimmed.startsWith('name') || trimmed.startsWith('computer_name')) {
                            return l.replace(/(["'])([^"']*?)(["'])/g, (m, q1, val, q2) => `${q1}${val.replace(/_/g, '-')}${q2}`);
                        }
                        return l;
                    }).join('\n');

                    if (!cleanedBody.toLowerCase().includes('computer_name')) {
                        const nameMatch = cleanedBody.match(/name\s*=\s*(["'])([^"']*?)(["'])/i);
                        if (nameMatch) {
                            cleanedBody = `  computer_name = "${nameMatch[2].replace(/_/g, '-')}"\n${cleanedBody}`;
                        }
                    }

                    // Strict fix: remove disable_password_authentication from Windows VMs
                    if (resourceType === 'azurerm_windows_virtual_machine') {
                        cleanedBody = cleanedBody.replace(/^\s*disable_password_authentication\s*=\s*.*$/gm, '');
                        // Force computer_name length to 15 (Windows limitation)
                        cleanedBody = cleanedBody.replace(/computer_name\s*=\s*(["'])([^"']*?)\1/gi, (m, q, val) => {
                            return `computer_name = ${q}${val.substring(0, 15)}${q}`;
                        });
                        // Fix unavailable SKU (Windows-10 pro often fails in many regions, force Server 2022)
                        if (cleanedBody.includes('Windows-10')) {
                            cleanedBody = cleanedBody.replace(/publisher\s*=\s*"MicrosoftWindowsDesktop"/gi, 'publisher = "MicrosoftWindowsServer"');
                            cleanedBody = cleanedBody.replace(/offer\s*=\s*"Windows-10"/gi, 'offer = "WindowsServer"');
                            cleanedBody = cleanedBody.replace(/sku\s*=\s*"(?:21h2-pro|latest|pro)"/gi, 'sku = "2022-Datacenter"');
                        }
                    }
                } else if (resourceType === 'azurerm_kubernetes_cluster') {
                    // 1. RBAC block to attribute (azurerm v3 style) - Aggressive case-insensitive
                    cleanedBody = cleanedBody.replace(/role_based_access_control\s*\{[\s\S]*?enabled\s*=\s*(true|false)[\s\S]*?\}/gim, 'role_based_access_control_enabled = $1');

                    // 2. enable_auto_scaling placement (must be inside default_node_pool)
                    let autoScaleVal = 'true';
                    const autoScaleRegex = /^[ \t]*(?:enable_auto_scaling|auto_scaling_enabled)\s*=\s*(true|false).*/gim;

                    if (autoScaleRegex.test(cleanedBody)) {
                        const matches = cleanedBody.match(autoScaleRegex);
                        if (matches) {
                            const lastMatch = matches[matches.length - 1];
                            const vMatch = lastMatch.match(/=\s*(true|false)/i);
                            if (vMatch) autoScaleVal = vMatch[1];
                        }
                        // Remove all occurrences from root
                        cleanedBody = cleanedBody.replace(autoScaleRegex, '');
                    }

                    if (!/default_node_pool\s*\{[\s\S]*?(?:enable_auto_scaling|auto_scaling_enabled)/i.test(cleanedBody)) {
                        cleanedBody = cleanedBody.replace(/(default_node_pool\s*\{)/i, `$1\n    auto_scaling_enabled = ${autoScaleVal}`);
                    } else {
                        // Rename it if it's already there but with the wrong name
                        cleanedBody = cleanedBody.replace(/enable_auto_scaling\s*=/gi, 'auto_scaling_enabled =');
                    }

                    // 3. If auto-scaling is enabled, remove node_count from default_node_pool to avoid conflicts
                    if (autoScaleVal === 'true') {
                        cleanedBody = cleanedBody.replace(/default_node_pool\s*\{([\s\S]*?)\}/i, (m, poolBody) => {
                            const cleanedPool = poolBody.replace(/^\s*node_count\s*=\s*.*$/gm, '');
                            return `default_node_pool {${cleanedPool}}`;
                        });
                    }

                    // 4. Remove kubernetes_version to let Azure pick the regional default (prevents K8sVersionNotSupported)
                    cleanedBody = cleanedBody.replace(/^\s*kubernetes_version\s*=\s*.*$/gm, '');

                    // 5. Fix dns_prefix naming
                    cleanedBody = cleanedBody.split('\n').map(l => {
                        if (l.trim().toLowerCase().startsWith('dns_prefix')) {
                            return l.replace(/(["'])([^"']*?)(["'])/g, (m, q1, val, q2) => `${q1}${val.replace(/_/g, '-')}${q2}`);
                        }
                        return l;
                    }).join('\n');

                    // 6. Fix node_vm_size deprecation (replace with vm_size) inside default_node_pool
                    cleanedBody = cleanedBody.replace(/node_vm_size\s*=/gi, 'vm_size =');
                } else if (resourceType === 'azurerm_postgresql_flexible_server') {
                    // Force strip backup and high_availability blocks which conflict with common SKUs
                    cleanedBody = cleanedBody.replace(/backup\s*\{[\s\S]*?\}/gi, '');
                    cleanedBody = cleanedBody.replace(/high_availability\s*\{[\s\S]*?\}/gi, '');

                    // Auto-fix sku_name prefixes if missing (Standard_B1ms -> B_Standard_B1ms)
                    cleanedBody = cleanedBody.replace(/sku_name\s*=\s*(["'])Standard_B([^"']*)\1/gi, 'sku_name = $1B_Standard_B$2$1');
                    cleanedBody = cleanedBody.replace(/sku_name\s*=\s*(["'])Standard_D([^"']*)\1/gi, 'sku_name = $1GP_Standard_D$2$1');
                    cleanedBody = cleanedBody.replace(/sku_name\s*=\s*(["'])Standard_E([^"']*)\1/gi, 'sku_name = $1MO_Standard_E$2$1');

                    // Override auto_grow_enabled which crashes on smaller SKUs unconditionally
                    cleanedBody = cleanedBody.replace(/auto_grow_enabled\s*=\s*true/gi, 'auto_grow_enabled = false');
                } else if (resourceType === 'azurerm_storage_account') {
                    // Wrap the name attribute with terraform functions to ensure it matches the strict storage format
                    cleanedBody = cleanedBody.replace(/name\s*=\s*(["'][^"']+["'])/gi, 'name = substr(replace(lower($1), "-", ""), 0, 24)');
                } else if (resourceType === 'azurerm_key_vault') {
                    // Wrap the name attribute to strictly enforce max 24 chars limit
                    cleanedBody = cleanedBody.replace(/name\s*=\s*(["'][^"']+["'])/gi, 'name = substr($1, 0, 24)');

                    // Capitalize permission blocks ("get" -> "Get") inside access_policy
                    ['secret_permissions', 'key_permissions', 'certificate_permissions'].forEach(permType => {
                        const regex = new RegExp(`${permType}\\s*=\\s*\\[([\\s\\S]*?)\\]`, 'gi');
                        cleanedBody = cleanedBody.replace(regex, (match, permsInner) => {
                            const fixedPerms = permsInner.replace(/(["'])([a-z])([a-zA-Z]*)\1/gi, (m: any, q: any, firstLetter: string, rest: string) => {
                                return `${q}${firstLetter.toUpperCase()}${rest.toLowerCase()}${q}`;
                            });
                            return `${permType} = [${fixedPerms}]`;
                        });
                    });
                }

                const prefix = sanitizedCode.substring(0, bodyStartIdx);
                const suffix = sanitizedCode.substring(endIdx - 1);
                sanitizedCode = prefix + cleanedBody + suffix;

                // IMPORTANT: update lastIndex to skip the resource we just processed
                resourceHeaderRegex.lastIndex = prefix.length + cleanedBody.length + 1;
            }
        }

        return sanitizedCode.replace(/\n{3,}/g, '\n\n').trim();
    }

    private injectScripts(code: string, scripts: Array<{ name: string, content: string, language: string }>): string {
        let injectedCode = code;
        
        // Find all VM resources
        const vmRegex = /resource\s+["'](azurerm_(?:linux|windows)_virtual_machine)["']\s+["']([^"']+)["']/gi;
        let match;
        const vms: Array<{ type: string, name: string }> = [];
        
        while ((match = vmRegex.exec(code)) !== null) {
            vms.push({ type: match[1], name: match[2] });
        }

        if (vms.length === 0) return code;

        scripts.forEach((script, index) => {
            const b64Content = Buffer.from(script.content).toString('base64');
            const safeScriptName = script.name.replace(/[^a-z0-9]/gi, '').toLowerCase().substring(0, 20);
            
            vms.forEach((vm, vmIndex) => {
                const isWindows = vm.type.includes('windows');
                const extensionName = `ext_${safeScriptName}_${vmIndex}_${index}`;
                
                let extensionHcl = '';
                if (isWindows) {
                    extensionHcl = `
resource "azurerm_virtual_machine_extension" "${extensionName}" {
  name                 = "${script.name.substring(0, 50)}"
  virtual_machine_id   = ${vm.type}.${vm.name}.id
  publisher            = "Microsoft.Compute"
  type                 = "CustomScriptExtension"
  type_handler_version = "1.10"

  settings = <<SETTINGS
    {
        "commandToExecute": "powershell -ExecutionPolicy Unrestricted -Command \\"[System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${b64Content}')) | Out-File -FilePath terraform_script.ps1; ./terraform_script.ps1\\""
    }
SETTINGS
}
`;
                } else {
                    extensionHcl = `
resource "azurerm_virtual_machine_extension" "${extensionName}" {
  name                 = "${script.name.substring(0, 50)}"
  virtual_machine_id   = ${vm.type}.${vm.name}.id
  publisher            = "Microsoft.Azure.Extensions"
  type                 = "CustomScript"
  type_handler_version = "2.0"

  settings = <<SETTINGS
    {
        "commandToExecute": "echo '${b64Content}' | base64 -d > terraform_script.sh; chmod +x terraform_script.sh; ./terraform_script.sh"
    }
SETTINGS
}
`;
                }
                
                injectedCode += `\n${extensionHcl}`;
            });
        });

        return injectedCode;
    }

    private parseResources(jsonOutput: string): any[] {
        try {
            const data = JSON.parse(jsonOutput);
            const resources = data.values?.root_module?.resources || [];
            
            return resources.map((r: any) => ({
                id: r.values.id,
                name: r.values.name,
                type: r.type,
                address: r.address,
                provider: r.provider_name,
                location: r.values.location,
                resource_group: r.values.resource_group_name,
                // Extra metadata depending on type
                public_ip: r.values.public_ip_address,
                private_ip: r.values.private_ip_address,
                fqdn: r.values.fqdn,
                provisioning_state: r.values.provisioning_state
            }));
        } catch (e) {
            this.logger.error(`Failed to parse terraform state: ${e.message}`);
            return [];
        }
    }
}
