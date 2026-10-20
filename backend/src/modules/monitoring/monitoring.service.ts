import { Injectable, Logger } from '@nestjs/common';
import { TenantsService } from '../tenants/tenants.service';
import { ClientSecretCredential } from '@azure/identity';
import { ComputeManagementClient } from '@azure/arm-compute';
import { NetworkManagementClient } from '@azure/arm-network';
import { ResourceManagementClient } from '@azure/arm-resources';
import { MonitorClient } from '@azure/arm-monitor';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);
  private activeSubscriptions = new Map<string, {
    payload: any;
    callback: (data: any) => void;
    interval?: NodeJS.Timeout;
    clientIds: Set<string>;
    userId: string;
    metricsHistory: Map<string, any[]>;
  }>();

  constructor(private readonly tenantsService: TenantsService) {}

  async subscribeClient(clientId: string, payload: any, callback: (data: any) => void) {
    const { resourceId } = payload;
    
    if (!this.activeSubscriptions.has(resourceId)) {
      this.activeSubscriptions.set(resourceId, {
        payload,
        callback,
        clientIds: new Set([clientId]),
        userId: payload.userId, // Expect userId in payload
        metricsHistory: new Map<string, any[]>(),
      });
      
      // Start polling for this resource
      this.startPolling(resourceId);
    } else {
      const sub = this.activeSubscriptions.get(resourceId);
      if (sub) {
        sub.clientIds.add(clientId);
      }
    }

    // Immediate first fetch
    this.pollResource(resourceId);
  }

  unsubscribeClient(clientId: string, resourceId?: string) {
    if (resourceId) {
      const sub = this.activeSubscriptions.get(resourceId);
      if (sub) {
        sub.clientIds.delete(clientId);
        if (sub.clientIds.size === 0) {
          if (sub.interval) clearInterval(sub.interval);
          this.activeSubscriptions.delete(resourceId);
        }
      }
    } else {
      // Global cleanup for this client id
      for (const [resId, sub] of this.activeSubscriptions.entries()) {
        sub.clientIds.delete(clientId);
        if (sub.clientIds.size === 0) {
          if (sub.interval) clearInterval(sub.interval);
          this.activeSubscriptions.delete(resId);
        }
      }
    }
  }

  private startPolling(resourceId: string) {
    const sub = this.activeSubscriptions.get(resourceId);
    if (sub && !sub.interval) {
      sub.interval = setInterval(() => {
        this.pollResource(resourceId);
      }, 15000); // Poll every 15 seconds
    }
  }

  private async pollResource(resourceId: string) {
    const sub = this.activeSubscriptions.get(resourceId);
    if (!sub) return;

    try {
      const { tenantId, resourceType, resourceName, resourceGroupName } = sub.payload;
      const tenant = await this.tenantsService.findOne(tenantId, sub.userId);
      
      if (!tenant) {
        this.logger.error(`Tenant ${tenantId} not found for monitoring`);
        return;
      }

      const credential = new ClientSecretCredential(
        tenant.tenant_id,
        tenant.client_id,
        tenant.encrypted_client_secret,
      );

      let statusData: any = { resourceId, timestamp: new Date(), status: 'Sincronizando...' };
      const normalizedType = resourceType.toLowerCase().replace(/_/g, '');
      const isVM = normalizedType.includes('virtualmachine');
      const isNIC = normalizedType.includes('networkinterface');

      this.logger.debug(`Polling resource: ${resourceName} (${resourceType})`);

      // 1. Get Base Status using the most robust method (getById)
      try {
        const resourceClient = new ResourceManagementClient(credential, tenant.subscription_id);
        const resource = await resourceClient.resources.getById(resourceId, '2021-04-01');
        statusData.status = (resource as any).provisioningState || 'Succeeded';
      } catch (resourceError) {
        this.logger.warn(`Could not get base status for ${resourceName} via getById (falling back to Succeeded): ${resourceError.message}`);
        statusData.status = 'Succeeded';
      }

      // 2. Get Specific Details for VMs (Power State)
      if (isVM) {
        try {
          const computeClient = new ComputeManagementClient(credential, tenant.subscription_id);
          const vm = await computeClient.virtualMachines.get(resourceGroupName, resourceName, { expand: 'instanceView' });
          
          if (vm.instanceView) {
            const powerState = vm.instanceView.statuses?.find(s => s.code?.startsWith('PowerState/'))?.displayStatus;
            if (powerState) statusData.status = powerState;
            statusData.details = vm.instanceView.statuses;
          }
          statusData.provisioningState = vm.provisioningState;
          
          // Determine Total Memory based on VM Size
          const vmSize = vm.hardwareProfile?.vmSize || '';
          statusData.vmSize = vmSize;
          const sizeToRam: Record<string, number> = {
            'Standard_B1s': 1 * 1024 * 1024 * 1024,
            'Standard_B1ms': 2 * 1024 * 1024 * 1024,
            'Standard_B2s': 4 * 1024 * 1024 * 1024,
            'Standard_B2ms': 8 * 1024 * 1024 * 1024,
            'Standard_D2s_v3': 8 * 1024 * 1024 * 1024,
            'Standard_D4s_v3': 16 * 1024 * 1024 * 1024,
            'Standard_DS1_v2': 3.5 * 1024 * 1024 * 1024,
            'Standard_DS2_v2': 7 * 1024 * 1024 * 1024,
          };
          statusData.totalMemory = sizeToRam[vmSize] || null;
        } catch (vmError) {
          this.logger.error(`Error getting VM details for ${resourceName}: ${vmError.message}`);
        }

        // 3. Fetch Metrics for VMs
        try {
          const monitorClient = new MonitorClient(credential, tenant.subscription_id);
          const timespan = "PT1H";
          const interval = "PT1M";
          
          // Use standard metrics. Requesting an invalid metric can sometimes cause 0 results or errors depending on API version
          const metrics = await monitorClient.metrics.list(resourceId, {
            timespan,
            interval,
            metricnames: "Percentage CPU,Network In,Network Out,Disk Read Bytes,Disk Write Bytes,Available Memory Bytes",
            aggregation: "Average"
          });

          this.logger.debug(`Metrics available for ${resourceName}: ${metrics.value?.map(m => m.name?.value).join(', ')}`);

          const cpuPoints = metrics.value?.find(m => m.name?.value === "Percentage CPU")?.timeseries?.[0]?.data || [];
          const netInPoints = metrics.value?.find(m => m.name?.value === "Network In")?.timeseries?.[0]?.data || [];
          const netOutPoints = metrics.value?.find(m => m.name?.value === "Network Out")?.timeseries?.[0]?.data || [];
          const diskReadPoints = metrics.value?.find(m => m.name?.value === "Disk Read Bytes")?.timeseries?.[0]?.data || [];
          const diskWritePoints = metrics.value?.find(m => m.name?.value === "Disk Write Bytes")?.timeseries?.[0]?.data || [];
          const memPoints = metrics.value?.find(m => m.name?.value === "Available Memory Bytes")?.timeseries?.[0]?.data || [];
          
          if (cpuPoints.length > 0) {
            statusData.metrics = cpuPoints.slice(-20).map((d, i) => ({
              time: d.timeStamp,
              cpu: d.average || 0,
              netIn: netInPoints[i]?.average || 0,
              netOut: netOutPoints[i]?.average || 0,
              diskRead: diskReadPoints[i]?.average || 0,
              diskWrite: diskWritePoints[i]?.average || 0,
              memoryAvailable: memPoints[i]?.average || null,
            }));
            this.logger.debug(`Fetched ${statusData.metrics.length} metric points for ${resourceName}`);
          }
        } catch (metricsError) {
          this.logger.error(`Error fetching metrics for ${resourceName}: ${metricsError.message}`);
        }
      } else if (isNIC) {
        try {
          const networkClient = new NetworkManagementClient(credential, tenant.subscription_id);
          const nic = await networkClient.networkInterfaces.get(resourceGroupName, resourceName);
          statusData.status = nic.provisioningState || statusData.status;
          statusData.ipConfigurations = nic.ipConfigurations?.map(ip => ip.privateIPAddress);
        } catch (nicError) {
          this.logger.error(`Error getting NIC details for ${resourceName}: ${nicError.message}`);
        }
      }

      // Map technical status to user-friendly labels
      statusData.status = this.mapStatus(statusData.status, resourceType);
      
      this.logger.debug(`Status for ${resourceName}: ${statusData.status}`);
      sub.callback(statusData);

    } catch (error) {
      this.logger.error(`Error polling resource ${resourceId}: ${error.message}`);
      sub.callback({ resourceId, error: error.message, timestamp: new Date() });
    }
  }

  private mapStatus(rawStatus: string, resourceType: string): string {
    const status = (rawStatus || 'Unknown').toLowerCase();
    const prefix = 'resources.monitoring.status.';
    
    // Virtual Machine Specific Mapping
    if (resourceType.toLowerCase().includes('virtualmachine')) {
      if (status.includes('running')) return `${prefix}running`;
      if (status.includes('deallocated') || status.includes('stopped')) return `${prefix}stopped`;
      if (status.includes('starting')) return `${prefix}starting`;
      if (status.includes('updating')) return `${prefix}updating`;
      if (status.includes('deleting')) return `${prefix}deleting`;
    }

    // Provisioning States (Generic)
    if (status === 'succeeded') return `${prefix}active`;
    if (status === 'updating') return `${prefix}updating`;
    if (status === 'failed') return `${prefix}failed`;
    if (status === 'creating') return `${prefix}creating`;
    if (status === 'deleting') return `${prefix}deleting`;

    return rawStatus || `${prefix}syncing`;
  }
}
