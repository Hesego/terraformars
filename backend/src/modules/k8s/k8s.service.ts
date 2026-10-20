import { Injectable, Logger } from '@nestjs/common';
import { ContainerServiceClient } from '@azure/arm-containerservice';
import { ClientSecretCredential } from '@azure/identity';
import * as k8s from '@kubernetes/client-node';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class K8sService {
    private readonly logger = new Logger(K8sService.name);

    constructor(private tenantsService: TenantsService) {}

    private async getClient(tenantId: string, userId: string, resourceGroupName: string, clusterName: string) {
        const azureTenant = await this.tenantsService.findOne(tenantId, userId);
        if (!azureTenant) {
            throw new Error('Tenant not found or access denied');
        }

        const credential = new ClientSecretCredential(
            azureTenant.tenant_id,
            azureTenant.client_id,
            azureTenant.encrypted_client_secret // Assuming it's already decrypted by findOne
        );

        const client = new ContainerServiceClient(credential, azureTenant.subscription_id);
        
        try {
            const credentials = await client.managedClusters.listClusterAdminCredentials(
                resourceGroupName,
                clusterName
            );

            if (!credentials.kubeconfigs || credentials.kubeconfigs.length === 0) {
                throw new Error('No kubeconfigs found for cluster');
            }

            const kubeconfigContent = credentials.kubeconfigs[0].value!.toString();
            const kc = new k8s.KubeConfig();
            kc.loadFromString(kubeconfigContent);
            return kc;
        } catch (error) {
            this.logger.error(`Failed to get KubeConfig for cluster ${clusterName}: ${error.message}`);
            throw error;
        }
    }

    async getPods(tenantId: string, userId: string, resourceGroup: string, clusterName: string, namespace = 'default') {
        const kc = await this.getClient(tenantId, userId, resourceGroup, clusterName);
        const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
        const res = await k8sApi.listNamespacedPod({ namespace });
        return res.items;
    }

    async getNodes(tenantId: string, userId: string, resourceGroup: string, clusterName: string) {
        const kc = await this.getClient(tenantId, userId, resourceGroup, clusterName);
        const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
        const res = await k8sApi.listNode();
        return res.items;
    }

    async getServices(tenantId: string, userId: string, resourceGroup: string, clusterName: string, namespace = 'default') {
        const kc = await this.getClient(tenantId, userId, resourceGroup, clusterName);
        const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
        const res = await k8sApi.listNamespacedService({ namespace });
        return res.items;
    }
}
