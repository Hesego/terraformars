import { Injectable } from '@nestjs/common';

@Injectable()
export class TemplateParserService {
    /**
     * Extracts variables from HCL code using regex.
     * Looks for variable "name" { ... } blocks.
     */
    extractVariables(hclCode: string): any[] {
        const variableRegex = /variable\s+"([^"]+)"\s+\{([^}]*)\}/g;
        const variables: any[] = [];
        let match: any;

        while ((match = variableRegex.exec(hclCode)) !== null) {
            const name = match[1];
            const body = match[2];

            const typeMatch = body.match(/type\s+=\s+([^\n]+)/);
            const defaultMatch = body.match(/default\s+=\s+([^\n]+)/);
            const descMatch = body.match(/description\s+=\s+"([^"]+)"/);

            variables.push({
                name,
                type: typeMatch ? typeMatch[1].trim().replace(/["']/g, '') : 'string',
                default: defaultMatch ? defaultMatch[1].trim().replace(/["']/g, '') : null,
                description: descMatch ? descMatch[1] : '',
            });
        }

        return variables;
    }

    /**
     * Detects the main resource type from the code.
     */
    detectResourceType(hclCode: string): string {
        const resourceRegex = /resource\s+"([^"]+)"/g;
        const matches: string[] = [];
        let match: any;
        while ((match = resourceRegex.exec(hclCode)) !== null) {
            matches.push(match[1]);
        }

        if (matches.length === 0) return 'unknown';

        // Sort by commonality or just take the first significant one
        const significant = matches.find(m => m.startsWith('azurerm_'));
        return significant || matches[0];
    }

    /**
     * Removes markdown code blocks if present.
     */
    cleanHCL(code: string): string {
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
}
