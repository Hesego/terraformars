import { Injectable, Logger, InternalServerErrorException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenAIService {
    private readonly openai: OpenAI;
    private readonly logger = new Logger(OpenAIService.name);

    constructor(private configService: ConfigService) {
        const apiKey = this.configService.get<string>('OPENAI_API_KEY');
        if (!apiKey) {
            // Fail fast at startup — don't let users hit a cryptic runtime error
            throw new Error('FATAL: OPENAI_API_KEY is not configured. The application cannot start without it.');
        }
        this.openai = new OpenAI({ apiKey });
    }

    async generateTerraformTemplate(description: string): Promise<string> {
        if (!description?.trim()) {
            throw new BadRequestException('La descripción no puede estar vacía.');
        }

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `Eres un experto en Terraform y Azure.
Genera una plantilla Terraform completamente funcional para el siguiente requerimiento:
[DESCRIPCIÓN DEL USUARIO]

Requisitos OBLIGATORIOS:
- Usar provider azurerm versión >= 3.0 (preferiblemente 4.x)
- Declarar variables necesarias con descripciones y tipos
- VALIDACIÓN HCL: Prohibido redefinir atributos. Cada argumento en un recurso debe declararse una SÓLA vez.
- No omitir dependencias: DEBES INCLUIR un bloque 'resource "azurerm_resource_group"' para contener tus recursos, a menos que el usuario indique explícitamente que uses uno existente.
- Si usas azurerm_linux_virtual_machine:
    - DEBES incluir disable_password_authentication = false (si usas password)
    - IMPORTANTÍSIMO: El computer_name NO DEBE contener guiones bajos (_). Usa guiones medios (-) en su lugar.
- Si usas azurerm_windows_virtual_machine:
    - NUNCA uses 'disable_password_authentication'. Este parámetro NO existe para Windows.
    - DEBES incluir 'admin_password'.
    - El 'computer_name' DEBE tener un MÁXIMO de 15 caracteres. Escórtalo si es necesario. (Ej: 'winvm-prod').
    - Para el bloque 'source_image_reference', utiliza siempre una imagen robusta de servidor: publisher = "MicrosoftWindowsServer", offer = "WindowsServer", sku = "2022-Datacenter". Evita usar SKUs de escritorio como "Windows-10".
- Si usas azurerm_kubernetes_cluster (AKS):
    - NO USAR el bloque 'role_based_access_control { ... }'. Usar el atributo 'role_based_access_control_enabled = true' en su lugar.
    - AUTO-ESCALADO: Usar el atributo 'auto_scaling_enabled = true' dentro del bloque 'default_node_pool'. NO USAR 'enable_auto_scaling'.
    - Si el auto-escalado está activo, NO INCLUIR 'node_count'; solo 'min_count' y 'max_count'.
    - En default_node_pool, usa SIEMPRE 'vm_size' y NUNCA 'node_vm_size'.
    - El 'dns_prefix' NO DEBE contener guiones bajos (_).
    - IMPORTANTE: No especifiques 'kubernetes_version' a menos que el usuario lo pida; deja que Azure use la versión por defecto para evitar errores de compatibilidad regional.
- Si usas azurerm_postgresql_flexible_server:
    - NO USAR el bloque 'backup { ... }'.
    - NO USAR el bloque 'high_availability { ... }'. 
    - NO USAR el argumento 'auto_grow_enabled = true' en el nivel B. Forzar 'auto_grow_enabled = false'.
    - El sku_name DEBE tener el prefijo válido del tier, ej: 'B_Standard_B1ms', 'GP_Standard_D2s_v3'. Nunca uses solo 'Standard_B1ms'.
    - RED Y DNS (CRÍTICO): Si el usuario pide el servidor dentro de una VNet (usando 'delegated_subnet_id'):
        1. DEBES incluir un recurso 'azurerm_private_dns_zone' con un nombre que termine en '.postgres.database.azure.com'.
        2. DEBES incluir un 'azurerm_private_dns_zone_virtual_network_link' para conectar la zona DNS con la VNet.
        3. El atributo 'private_dns_zone_id' en el servidor es OBLIGATORIO y debe apuntar al ID de la zona DNS creada.
        4. La subred ('azurerm_subnet') que reciba el servidor DEBE incluir obligatoriamente el bloque 'delegation { name = "fs" service_delegation { name = "Microsoft.DBforPostgreSQL/flexibleServers" actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"] } }'.
        5. El atributo 'public_network_access_enabled' DEBE ser 'false' si se está usando una VNet. No se pueden tener ambos activos a menos que se use Private Link (pero por defecto la IA debe elegir aislamiento total).
        6. NO USAR el bloque 'storage { ... }'. Los argumentos 'storage_mb' y 'storage_tier' deben declararse directamente en la raíz del recurso 'azurerm_postgresql_flexible_server'.
        7. VALORES DE STORAGE: 'storage_tier' solo acepta valores tipo Premium SSD (P4, P6, P10, P15, P20, P30, P40). NUNCA uses 'Standard'. Si no estás seguro, omite este atributo y deja que Azure use el valor por defecto.
- Si usas azurerm_storage_account:
    - El nombre debe tener entre 3 y 24 caracteres, SIN guiones medios (-) ni espacios, SOLO minúsculas y números. Trunca o simplifica el nombre si es necesario.
- Si usas azurerm_key_vault:
    - Los permisos dentro de 'access_policy' (ej. secret_permissions) DEBEN ir con la primera letra mayúscula ("Get", "List", "Set", "Delete"). NUNCA en minúsculas.
- Si usas azurerm_public_ip:
    - DEBES usar 'sku = "Standard"'.
    - IMPORTANTE: Si el SKU es "Standard", el 'allocation_method' DEBE ser "Static". NUNCA uses "Dynamic" con SKU "Standard".
- Si usas azurerm_network_interface: NUNCA incluyas el atributo 'network_security_group_id' dentro de este recurso. Para asociar un NSG a una interfaz, DEBES utilizar el recurso independiente 'azurerm_network_interface_security_group_association'.
- NUNCA incluyas el bloque 'provider "azurerm" { features {} }' en el código generado. El backend se encarga de inyectar la configuración del proveedor automáticamente. Solo genera los recursos, variables y outputs.
- NUNCA utilices módulos locales (es decir, NO USES 'module "xxx" { source = "./..." }'). Todo el código, variables, recursos y outputs deben escribirse de manera plana en un único archivo raíz 'main.tf'.
- PROHIBIDO USAR MARCADORES DE POSICIÓN (placeholders) de cualquier tipo, como "your-vnet-name", "<EXISTING_SUBNET_ID>", "REPLACE_ME", etc. Si el recurso solicitado requiere una red y no se proporciona un ID real y completo, DEBES incluir en el código la creación de 'azurerm_virtual_network' y 'azurerm_subnet' con nombres válidos.
- FIDELIDAD DE DATOS: Si el usuario proporciona un JSON de referencia para "copiar" o "clonar" un recurso, DEBES respetar el Sistema Operativo (Windows vs Linux), el editor de la imagen (Publisher), la oferta (Offer) y el SKU. No cambies una VM de Windows por Linux a menos que se pida explícitamente.
- Generar código listo para producción con sintaxis moderna de azurerm v4.x.


- Incluir outputs relevantes.
- No incluir bloque de triple backtick (markdown), solo el texto plano de Terraform.
- No incluir explicación, solo devolver el código HCL (Terraform)
`,
                    },
                    {
                        role: 'user',
                        content: description,
                    },
                ],
                temperature: 0.2,
            });

            const code = response.choices[0]?.message?.content?.trim();
            if (!code) {
                this.logger.error('OpenAI returned an empty response for template generation.');
                throw new InternalServerErrorException(
                    'El modelo de IA no pudo generar una plantilla para este requerimiento. Por favor, intenta reformular tu descripción con más detalles.'
                );
            }
            return code;
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;
            this.logger.error(`Error generating Terraform template: ${error.message}`);
            throw new InternalServerErrorException(`Error al comunicarse con el servicio de IA: ${error.message}`);
        }
    }

    async estimateCost(terraformCode: string): Promise<number> {
        if (!terraformCode?.trim()) return 0;
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `Eres un experto en costos de Azure.
Analiza el siguiente código de Terraform y proporciona un costo mensual aproximado en USD.
Debes devolver ÚNICAMENTE un número decimal, sin texto, sin símbolos de moneda, sin explicaciones.
Si no puedes determinar un costo, devuelve 0.
Considera SKUs estándar y tamaños de instancias comunes si no se especifican.`,
                    },
                    {
                        role: 'user',
                        content: terraformCode,
                    },
                ],
                temperature: 0,
            });

            const costStr = response.choices[0]?.message?.content?.trim() || '0';
            const cost = parseFloat(costStr);
            return isNaN(cost) ? 0 : cost;
        } catch (error) {
            this.logger.warn(`Could not estimate cost (non-critical): ${error.message}`);
            return 0;
        }
    }

    async detectScalableAttributes(terraformCode: string): Promise<any[]> {
        if (!terraformCode?.trim()) return [];
        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `Analiza el código Terraform de Azure y encuentra atributos que definan el tamaño o rendimiento de los recursos principales (VMs, DBs, AKS, App Services, etc).
Para cada uno, proporciona:
1. El identificador del recurso (ej: azurerm_linux_virtual_machine.vm)
2. El nombre del atributo (ej: size, sku_name, tier)
3. El valor actual en el código.
4. Una lista de 10 opciones comunes de Azure que sean válidas para ese recurso específico.
5. Un label amigable.

Devuelve estrictamente un objeto JSON con la siguiente estructura:
{
  "attributes": [
    {"resource": "...", "attribute": "...", "current": "...", "options": ["...", "..."], "label": "..."}
  ]
}
Si no hay nada escalable, devuelve {"attributes": []}.`,
                    },
                    {
                        role: 'user',
                        content: terraformCode,
                    },
                ],
                temperature: 0,
                response_format: { type: 'json_object' },
            });

            const content = response.choices[0]?.message?.content || '{}';
            this.logger.debug(`Scalable attributes detection result: ${content}`);
            try {
                const parsed = JSON.parse(content);
                return Array.isArray(parsed.attributes) ? parsed.attributes : [];
            } catch (parseError) {
                this.logger.warn(`Could not parse scalable attributes JSON: ${parseError.message}`);
                return [];
            }
        } catch (error) {
            this.logger.warn(`Error detecting scalable attributes (non-critical): ${error.message}`);
            return [];
        }
    }

    async refineTerraformTemplate(currentCode: string, prompt: string): Promise<string> {
        if (!prompt?.trim()) {
            throw new BadRequestException('El prompt de refinamiento no puede estar vacío.');
        }
        if (!currentCode?.trim()) {
            throw new BadRequestException('No hay código de plantilla para refinar.');
        }

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `Eres un experto en Terraform y Azure.
Tu tarea es EDITAR el código Terraform existente basándote en las instrucciones del usuario.
[CÓDIGO ACTUAL]
${currentCode}

REGLAS DE REFINAMIENTO:
- Mantén la estructura general del código si es posible.
- Solo cambia lo que el usuario pida explícitamente o lo que sea necesario para cumplir su petición.
- Sigue las mismas reglas de calidad que para la generación inicial (ComputerName sin guiones bajos, SKUs válidos, etc).
- Devuelve ÚNICAMENTE el código HCL resultante. No incluyas explicaciones ni bloques de markdown.`,
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.2,
            });

            const code = response.choices[0]?.message?.content?.trim();
            if (!code) {
                throw new InternalServerErrorException(
                    'El modelo de IA devolvió una respuesta vacía al refinar la plantilla. Intenta con un prompt más específico.'
                );
            }
            return code;
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;
            this.logger.error(`Error refining Terraform template: ${error.message}`);
            throw new InternalServerErrorException(`Error al refinar la plantilla: ${error.message}`);
        }
    }

    async generateScript(description: string, language: string): Promise<string> {
        if (!description?.trim()) {
            throw new BadRequestException('El prompt no puede estar vacío.');
        }
        const allowedLanguages = ['powershell', 'bash'];
        if (!allowedLanguages.includes(language?.toLowerCase())) {
            throw new BadRequestException(`Lenguaje no soportado: "${language}". Use "powershell" o "bash".`);
        }

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `Eres un experto en scripting de sistemas y automatización cloud (Azure).
Tu tarea es generar un script en **${language}** que se ejecutará DIRECTAMENTE dentro de un servidor (VM).

REGLAS DE ORO:
1. **Nativo es Mejor**: Los scripts se ejecutan dentro del Sistema Operativo. EVITA usar 'az cli' (comando 'az') a menos que el usuario lo pida explícitamente, ya que la VM podría no tenerlo instalado.
2. **Si es Bash (Linux)**: 
   - Usa shebang #!/bin/bash.
   - Usa comandos estándar (apt, yum, systemctl, ip, find, etc).
   - Variables: nombre="valor", uso: $nombre.
3. **Si es PowerShell (Windows)**:
   - Usa comandos nativos de PowerShell (Get-Service, Get-Process, New-Item, etc).
   - Variables: $nombre = "valor", uso: $nombre.
   - NUNCA uses sintaxis de Bash (como variable="valor" sin el $) en PowerShell.
4. **Seguridad**: No incluyas contraseñas en texto plano. Usa marcadores de posición si es necesario.
5. **Formato**:
   - No incluyas explicaciones antes o después.
   - Devuelve SOLO el código plano del script.
   - NUNCA incluyas bloques de markdown (como triple backticks).
   - El script debe estar listo para ejecutarse tal cual.
`,
                    },
                    {
                        role: 'user',
                        content: description,
                    },
                ],
                temperature: 0.3,
            });

            const script = response.choices[0]?.message?.content?.trim();
            if (!script) {
                throw new InternalServerErrorException(
                    'El modelo de IA no pudo generar el script. Intenta reformular tu pedido con más detalles sobre qué debe hacer el script.'
                );
            }
            return script;
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;
            this.logger.error(`Error generating script: ${error.message}`);
            throw new InternalServerErrorException(`Error al generar el script: ${error.message}`);
        }
    }

    async refineScript(currentCode: string, prompt: string, language: string): Promise<string> {
        if (!prompt?.trim()) {
            throw new BadRequestException('El prompt de refinamiento no puede estar vacío.');
        }
        if (!currentCode?.trim()) {
            throw new BadRequestException('No hay código de script para refinar.');
        }

        try {
            const response = await this.openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'system',
                        content: `Eres un experto en scripting (${language}).
Tu tarea es editar el script proporcionado basándote en las instrucciones del usuario.

REGLAS:
1. Mantén la consistencia con el lenguaje (${language}).
2. Si es PowerShell, asegura que todas las variables usen el prefijo '$'.
3. Si es Bash, asegura que el shebang esté presente.
4. Evita el uso de 'az cli' a menos que sea estrictamente necesario.
5. Devuelve solo el código editado, sin bloques de markdown y sin explicaciones.
`,
                    },
                    {
                        role: 'user',
                        content: `[CÓDIGO ACTUAL]:\n${currentCode}\n\n[INSTRUCCIÓN]:\n${prompt}`,
                    },
                ],
                temperature: 0.3,
            });

            const script = response.choices[0]?.message?.content?.trim();
            if (!script) {
                throw new InternalServerErrorException(
                    'El modelo de IA devolvió una respuesta vacía al refinar el script. Intenta con un prompt más específico.'
                );
            }
            return script;
        } catch (error) {
            if (error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error;
            this.logger.error(`Error refining script: ${error.message}`);
            throw new InternalServerErrorException(`Error al refinar el script: ${error.message}`);
        }
    }
}
