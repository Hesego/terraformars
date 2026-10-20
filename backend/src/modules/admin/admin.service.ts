import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ClientSecretCredential } from '@azure/identity';
import { ComputeManagementClient } from '@azure/arm-compute';
import { NetworkManagementClient } from '@azure/arm-network';
import { ContainerServiceClient } from '@azure/arm-containerservice';
import { WebSiteManagementClient } from '@azure/arm-appservice';
import { ResourceManagementClient } from '@azure/arm-resources';
import { TenantsService } from '../tenants/tenants.service';
import { DeploymentsService } from '../deployments/deployments.service';
import { EncryptionService } from '../../common/encryption.service';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private readonly tenantsService: TenantsService,
        private readonly deploymentsService: DeploymentsService,
        private readonly encryptionService: EncryptionService,
    ) {}

    private async getCredentials(tenantId: string, userId: string) {
        // Enforce ownership check by passing the authenticated userId to findOne
        const tenant = await this.tenantsService.findOne(tenantId, userId);
        if (!tenant) throw new NotFoundException(`Tenant ${tenantId} not found or access denied`);

        // TenantsService.findOne already decrypts the secret in its findOne method
        const decryptedSecret = tenant.encrypted_client_secret!;
        const credential = new ClientSecretCredential(
            tenant.tenant_id.trim(),
            tenant.client_id.trim(),
            decryptedSecret,
        );
        return { 
            credential, 
            subscriptionId: tenant.subscription_id.trim(), 
            tenant 
        };
    }

    async listVMs(tenantId: string, userId: string) {
        const { credential, subscriptionId } = await this.getCredentials(tenantId, userId);
        const client = new ComputeManagementClient(credential, subscriptionId);

        const vms: any[] = [];
        for await (const vm of client.virtualMachines.listAll()) {
            // Extract resource group from the id
            const rgMatch = vm.id?.match(/resourceGroups\/([^/]+)\//i);
            const resourceGroup = rgMatch ? rgMatch[1] : 'unknown';

            let powerState = 'Unknown';
            try {
                const vmWithView = await client.virtualMachines.get(resourceGroup, vm.name!, {
                    expand: 'instanceView',
                });
                const ps = vmWithView.instanceView?.statuses?.find(s => s.code?.startsWith('PowerState/'));
                if (ps) powerState = ps.displayStatus || ps.code || 'Unknown';
            } catch { /* skip power state if fails */ }

            vms.push({
                id: vm.id,
                name: vm.name,
                location: vm.location,
                resourceGroup,
                osType: vm.storageProfile?.osDisk?.osType,
                vmSize: vm.hardwareProfile?.vmSize,
                provisioningState: vm.provisioningState,
                powerState,
                tags: vm.tags,
            });
        }
        return vms;
    }

    async listAKSClusters(tenantId: string, userId: string) {
        const { credential, subscriptionId } = await this.getCredentials(tenantId, userId);
        const client = new ContainerServiceClient(credential, subscriptionId);

        const clusters: any[] = [];
        for await (const cluster of client.managedClusters.list()) {
            const rgMatch = cluster.id?.match(/resourceGroups\/([^/]+)\//i);
            const resourceGroup = rgMatch ? rgMatch[1] : 'unknown';
            clusters.push({
                id: cluster.id,
                name: cluster.name,
                location: cluster.location,
                resourceGroup,
                kubernetesVersion: cluster.kubernetesVersion,
                provisioningState: cluster.provisioningState,
                nodeCount: cluster.agentPoolProfiles?.reduce((acc, p) => acc + (p.count || 0), 0),
                powerState: cluster.powerState?.code,
                fqdn: cluster.fqdn,
                tags: cluster.tags,
            });
        }
        return clusters;
    }

    async listAppServices(tenantId: string, userId: string) {
        const { credential, subscriptionId } = await this.getCredentials(tenantId, userId);
        const client = new WebSiteManagementClient(credential, subscriptionId);

        const apps: any[] = [];
        for await (const app of client.webApps.list()) {
            const rgMatch = app.id?.match(/resourceGroups\/([^/]+)\//i);
            const resourceGroup = rgMatch ? rgMatch[1] : 'unknown';
            apps.push({
                id: app.id,
                name: app.name,
                location: app.location,
                resourceGroup,
                state: app.state,
                hostNames: app.hostNames,
                kind: app.kind,
                httpsOnly: app.httpsOnly,
                tags: app.tags,
            });
        }
        return apps;
    }

    async listVNets(tenantId: string, userId: string) {
        const { credential, subscriptionId } = await this.getCredentials(tenantId, userId);
        const client = new NetworkManagementClient(credential, subscriptionId);

        const vnets: any[] = [];
        for await (const vnet of client.virtualNetworks.listAll()) {
            const rgMatch = vnet.id?.match(/resourceGroups\/([^/]+)\//i);
            const resourceGroup = rgMatch ? rgMatch[1] : 'unknown';
            vnets.push({
                id: vnet.id,
                name: vnet.name,
                location: vnet.location,
                resourceGroup,
                addressSpace: vnet.addressSpace?.addressPrefixes,
                subnets: vnet.subnets?.map(s => ({ name: s.name, addressPrefix: s.addressPrefix })),
                provisioningState: vnet.provisioningState,
                peerings: vnet.virtualNetworkPeerings?.map(p => ({
                    id: p.id,
                    name: p.name,
                    remoteVNetId: p.remoteVirtualNetwork?.id,
                    peeringState: p.peeringState,
                })),
                tags: vnet.tags,
            });
        }
        return vnets;
    }

    async listDatabases(tenantId: string, userId: string) {
        const { credential, subscriptionId } = await this.getCredentials(tenantId, userId);
        const client = new ResourceManagementClient(credential, subscriptionId);

        const dbs: any[] = [];
        for await (const resource of client.resources.list()) {
            if (resource.type === 'Microsoft.DBforPostgreSQL/flexibleServers' || resource.type === 'Microsoft.DBforPostgreSQL/servers') {
                const rgMatch = resource.id?.match(/resourceGroups\/([^/]+)\//i);
                const resourceGroup = rgMatch ? rgMatch[1] : 'unknown';
                dbs.push({
                    id: resource.id,
                    name: resource.name,
                    type: resource.type,
                    location: resource.location,
                    resourceGroup,
                    tags: resource.tags,
                });
            }
        }
        return dbs;
    }

    async getAllResources(tenantId: string, userId: string) {
        const [vms, aks, appServices, vnets, databases] = await Promise.allSettled([
            this.listVMs(tenantId, userId),
            this.listAKSClusters(tenantId, userId),
            this.listAppServices(tenantId, userId),
            this.listVNets(tenantId, userId),
            this.listDatabases(tenantId, userId),
        ]);

        // Log any failures for diagnostic purposes
        [vms, aks, appServices, vnets, databases].forEach((res, idx) => {
            if (res.status === 'rejected') {
                const types = ['VMs', 'AKS', 'AppServices', 'VNets', 'Databases'];
                this.logger.error(`Failed to list ${types[idx]} for tenant ${tenantId}: ${res.reason?.message || res.reason}`);
            }
        });

        return {
            vms: vms.status === 'fulfilled' ? vms.value : [],
            aks: aks.status === 'fulfilled' ? aks.value : [],
            appServices: appServices.status === 'fulfilled' ? appServices.value : [],
            vnets: vnets.status === 'fulfilled' ? vnets.value : [],
            databases: databases.status === 'fulfilled' ? databases.value : [],
        };
    }

    async connectVNets(
        tenantId: string,
        userId: string,
        vnet1: { name: string; resourceGroup: string },
        vnet2: { id: string; name: string },
    ) {
        const { credential, subscriptionId } = await this.getCredentials(tenantId, userId);
        const client = new NetworkManagementClient(credential, subscriptionId);

        const peeringName1to2 = `peering-${vnet1.name}-to-${vnet2.name}`;
        const peeringName2to1 = `peering-${vnet2.name}-to-${vnet1.name}`;

        // Extract resource group from vnet2.id
        const rg2Match = vnet2.id.match(/resourceGroups\/([^/]+)\//i);
        const resourceGroup2 = rg2Match ? rg2Match[1] : vnet1.resourceGroup; // Fallback to same RG if match fails

        this.logger.log(`Creating bidirectional peering: ${vnet1.name} <-> ${vnet2.name}`);

        // Create peering 1 -> 2
        const poller1 = await client.virtualNetworkPeerings.beginCreateOrUpdate(
            vnet1.resourceGroup,
            vnet1.name,
            peeringName1to2,
            {
                remoteVirtualNetwork: { id: vnet2.id },
                allowVirtualNetworkAccess: true,
                allowForwardedTraffic: true,
                allowGatewayTransit: false,
                useRemoteGateways: false,
            },
        );

        // Create peering 2 -> 1
        const poller2 = await client.virtualNetworkPeerings.beginCreateOrUpdate(
            resourceGroup2,
            vnet2.name,
            peeringName2to1,
            {
                remoteVirtualNetwork: { id: `/subscriptions/${subscriptionId}/resourceGroups/${vnet1.resourceGroup}/providers/Microsoft.Network/virtualNetworks/${vnet1.name}` },
                allowVirtualNetworkAccess: true,
                allowForwardedTraffic: true,
                allowGatewayTransit: false,
                useRemoteGateways: false,
            },
        );

        await Promise.all([poller1.pollUntilDone(), poller2.pollUntilDone()]);
        return { success: true };
    }

    async disconnectVNet(
        tenantId: string,
        userId: string,
        resourceGroup: string,
        vnetName: string,
        peeringName: string,
    ) {
        const { credential, subscriptionId } = await this.getCredentials(tenantId, userId);
        const client = new NetworkManagementClient(credential, subscriptionId);

        try {
            // 1. Get the peering to find the remote VNet
            const peering = await client.virtualNetworkPeerings.get(resourceGroup, vnetName, peeringName);
            const remoteVNetId = peering.remoteVirtualNetwork?.id;

            if (remoteVNetId) {
                // Parse remote VNet name and resource group
                const match = remoteVNetId.match(/resourceGroups\/([^/]+)\/providers\/Microsoft\.Network\/virtualNetworks\/([^/]+)/i);
                if (match) {
                    const remoteRG = match[1];
                    const remoteVNetName = match[2];
                    const reversePeeringName = `peering-${remoteVNetName}-to-${vnetName}`;

                    this.logger.log(`Deleting reverse peering: ${reversePeeringName} from ${remoteVNetName}`);
                    
                    // Try to delete reverse peering (ignore error if not found)
                    try {
                        await client.virtualNetworkPeerings.beginDelete(remoteRG, remoteVNetName, reversePeeringName);
                    } catch (e) {
                        this.logger.warn(`Could not delete reverse peering: ${e.message}`);
                    }
                }
            }
        } catch (e) {
            this.logger.warn(`Could not fetch peering for bidirectional delete: ${e.message}`);
        }

        // 2. Delete the requested peering
        const poller = await client.virtualNetworkPeerings.beginDelete(
            resourceGroup,
            vnetName,
            peeringName,
        );
        await poller.pollUntilDone();
        return { success: true };
    }

    async executeScript(
        tenantId: string,
        userId: string,
        data: {
            resourceId: string;
            resourceName: string;
            resourceGroup: string;
            scriptId: string;
            osType: 'Linux' | 'Windows';
        },
    ) {
        return this.deploymentsService.executeScriptAdHoc(
            tenantId,
            userId,
            data.resourceId,
            data.resourceName,
            data.resourceGroup,
            data.scriptId,
            data.osType,
        );
    }
}
