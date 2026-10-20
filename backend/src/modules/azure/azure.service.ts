import { Injectable, Logger } from '@nestjs/common';
import { ClientSecretCredential } from '@azure/identity';
import { ComputeManagementClient } from '@azure/arm-compute';
import { ResourceManagementClient } from '@azure/arm-resources';

@Injectable()
export class AzureService {
    private readonly logger = new Logger(AzureService.name);

    private getComputeClient(credentials: {
        clientId: string;
        clientSecret: string;
        tenantId: string;
        subscriptionId: string;
    }): ComputeManagementClient {
        const credential = new ClientSecretCredential(
            credentials.tenantId,
            credentials.clientId,
            credentials.clientSecret,
        );
        return new ComputeManagementClient(credential, credentials.subscriptionId);
    }

    private getResourceClient(credentials: {
        clientId: string;
        clientSecret: string;
        tenantId: string;
        subscriptionId: string;
    }): ResourceManagementClient {
        const credential = new ClientSecretCredential(
            credentials.tenantId,
            credentials.clientId,
            credentials.clientSecret,
        );
        return new ResourceManagementClient(credential, credentials.subscriptionId);
    }

    async runCommand(
        credentials: {
            clientId: string;
            clientSecret: string;
            tenantId: string;
            subscriptionId: string;
        },
        params: {
            resourceGroupName: string;
            vmName: string;
            commandId: 'RunPowerShellScript' | 'RunShellScript';
            script: string[];
        }
    ) {
        try {
            const client = this.getComputeClient(credentials);
            this.logger.log(`Executing RunCommand on VM ${params.vmName} in RG ${params.resourceGroupName}`);

            const poller = await client.virtualMachines.beginRunCommand(
                params.resourceGroupName,
                params.vmName,
                {
                    commandId: params.commandId,
                    script: params.script
                }
            );

            const result = await poller.pollUntilDone();
            return result;
        } catch (error) {
            this.logger.error(`Failed to execute RunCommand: ${error.message}`);
            throw error;
        }
    }

    async deleteResourceGroup(
        credentials: {
            clientId: string;
            clientSecret: string;
            tenantId: string;
            subscriptionId: string;
        },
        resourceGroupName: string
    ) {
        try {
            const client = this.getResourceClient(credentials);
            this.logger.log(`Deleting Resource Group: ${resourceGroupName}`);
            
            // Start the deletion. We don't necessarily need to wait for it for a long time
            // but we'll return the poller result.
            const poller = await client.resourceGroups.beginDelete(resourceGroupName);
            return poller;
        } catch (error) {
            this.logger.error(`Failed to delete Resource Group ${resourceGroupName}: ${error.message}`);
            throw error;
        }
    }
}
