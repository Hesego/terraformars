import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { WebSiteManagementClient } from '@azure/arm-appservice';
import { ClientSecretCredential } from '@azure/identity';
import { TenantsService } from '../tenants/tenants.service';
import axios from 'axios';

@Injectable()
export class AppServiceService {
    private readonly logger = new Logger(AppServiceService.name);

    constructor(private tenantsService: TenantsService) {}

    private async getClient(tenantId: string, userId: string) {
        const azureTenant = await this.tenantsService.findOne(tenantId, userId);
        if (!azureTenant) {
            throw new HttpException('Tenant not found or access denied', HttpStatus.NOT_FOUND);
        }

        const tId = azureTenant.tenant_id.trim();
        const cId = azureTenant.client_id.trim();
        const sId = azureTenant.subscription_id.trim();

        const credential = new ClientSecretCredential(
            tId,
            cId,
            azureTenant.encrypted_client_secret
        );

        return {
            client: new WebSiteManagementClient(credential, sId),
            credential, 
            tenant: azureTenant
        };
    }

    async executeCommand(tenantId: string, userId: string, resourceGroup: string, name: string, command: string, dir?: string) {
        const { client, credential } = await this.getClient(tenantId, userId);
        
        try {
            // Fetch site details to get the correct SCM URL dynamically
            const site = await client.webApps.get(resourceGroup, name);
            const scmHostName = site.enabledHostNames?.find(h => h.includes('.scm.'));
            
            if (!scmHostName) {
                throw new Error(`Could not find SCM hostname for App Service ${name}`);
            }

            const tokenResponse = await credential.getToken('https://management.azure.com/.default');
            const token = tokenResponse.token;

            const scmUrl = `https://${scmHostName}/api/command`;
            this.logger.log(`Using SCM URL: ${scmUrl}`);

            const response = await axios.post(scmUrl, { command, dir }, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                timeout: 60000 // Increased to 60s
            });


            return response.data;
        } catch (error) {
            const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
            const data = error.response?.data;
            const message = data?.Message || data?.error || error.message;
            
            this.logger.error(`AppService Command Error (${status}): ${JSON.stringify(data || error.message)}`);
            throw new HttpException({
                message: `Azure SCM Error: ${message}`,
                azureError: data
            }, status);
        }
    }

    async getLogStream(tenantId: string, userId: string, resourceGroup: string, name: string) {
        const { client, credential } = await this.getClient(tenantId, userId);
        try {
            const site = await client.webApps.get(resourceGroup, name);
            const scmHostName = site.enabledHostNames?.find(h => h.includes('.scm.'));
            
            if (!scmHostName) throw new Error('SCM Hostname not found');

            const tokenResponse = await credential.getToken('https://management.azure.com/.default');
            const token = tokenResponse.token;

            return {
                url: `https://${scmHostName}/api/logstream`,
                auth: `Bearer ${token}`
            };
        } catch (error) {
            this.logger.error(`Failed to get log stream for ${name}: ${error.message}`);
            throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}





