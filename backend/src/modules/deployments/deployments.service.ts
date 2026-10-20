import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Deployment, DeploymentStatus } from '../../entities/deployment.entity';
import { ScriptExecution, ScriptExecutionStatus } from '../../entities/script-execution.entity';
import { AzureTenant } from '../../entities/azure-tenant.entity';
import { AzureService } from '../azure/azure.service';
import { ScriptsService } from '../scripts/scripts.service';
import { EncryptionService } from '../../common/encryption.service';

@Injectable()
export class DeploymentsService {
    constructor(
        @InjectRepository(Deployment)
        private deploymentRepository: Repository<Deployment>,
        @InjectRepository(AzureTenant)
        private tenantRepository: Repository<AzureTenant>,
        @InjectRepository(ScriptExecution)
        private scriptExecutionRepository: Repository<ScriptExecution>,
        @InjectQueue('deployments') private deploymentQueue: Queue,
        @InjectQueue('script-executions') private scriptExecutionQueue: Queue,
        private azureService: AzureService,
        private scriptsService: ScriptsService,
        private encryptionService: EncryptionService,
    ) { }

    private readonly logger = new Logger(DeploymentsService.name);

    async create(userId: string, data: any): Promise<Deployment> {
        try {
            this.logger.log(`Creating deployment for user ${userId} with data: ${JSON.stringify(data)}`);

            const deployment = this.deploymentRepository.create({
                parameters: data.parameters,
                template_id: data.template_id,
                tenant_id: data.tenant_id,
                script_ids: data.script_ids || [],
                user_id: userId,
                status: DeploymentStatus.PENDING,
            });

            const saved = await this.deploymentRepository.save(deployment);

            // Add to queue for processing
            await this.deploymentQueue.add('deploy-task', {
                deploymentId: saved.id,
            });

            return saved;
        } catch (error) {
            this.logger.error(`Failed to create deployment: ${error.message}`, error.stack);
            throw error;
        }
    }

    async findAll(userId: string): Promise<Deployment[]> {
        return this.deploymentRepository.find({
            where: { user_id: userId },
            relations: ['template', 'tenant'],
            order: { created_at: 'DESC' },
        });
    }

    async findOne(id: string, userId: string | null): Promise<Deployment | null> {
        const where: any = { id };
        if (userId) where.user_id = userId;

        return this.deploymentRepository.findOne({
            where,
            relations: ['template', 'tenant'],
        });
    }

    async updateStatus(id: string, status: DeploymentStatus, logs?: string, resources?: any[]): Promise<void> {
        const updateData: any = { status };
        if (logs !== undefined) updateData.logs = logs;
        if (resources !== undefined) updateData.resources_inventory = resources;
        if (status === DeploymentStatus.SUCCESS || status === DeploymentStatus.FAILED) {
            updateData.finished_at = new Date();
        }
        await this.deploymentRepository.update(id, updateData);
    }

    async appendLogs(id: string, logChunk: string): Promise<void> {
        await this.deploymentRepository
            .createQueryBuilder()
            .update(Deployment)
            .set({
                logs: () => `COALESCE(logs, '') || :chunk`
            })
            .setParameter('chunk', logChunk)
            .where("id = :id", { id })
            .execute();
    }

    async remove(id: string, userId: string): Promise<void> {
        const deployment = await this.deploymentRepository.findOne({
            where: { id, user_id: userId },
            relations: ['tenant']
        });

        if (!deployment) return;

        // Try to identify the Resource Group to clean up
        const resourceGroup = deployment.resources_inventory?.find(r => r.resource_group)?.resource_group;

        if (resourceGroup && deployment.tenant) {
            try {
                this.logger.log(`Triggering cleanup for Resource Group ${resourceGroup} in Azure`);
                const decryptedSecret = this.encryptionService.decrypt(deployment.tenant.encrypted_client_secret!);
                
                // We fire and forget the Azure deletion to avoid blocking the DB removal
                this.azureService.deleteResourceGroup(
                    {
                        clientId: deployment.tenant.client_id,
                        clientSecret: decryptedSecret,
                        tenantId: deployment.tenant.tenant_id,
                        subscriptionId: deployment.tenant.subscription_id,
                    },
                    resourceGroup
                ).catch(err => this.logger.error(`Azure cleanup failed for ${resourceGroup}: ${err.message}`));
            } catch (error) {
                this.logger.error(`Failed to initiate Azure cleanup: ${error.message}`);
            }
        }

        await this.deploymentRepository.remove(deployment);
    }

    async removeAll(userId: string): Promise<void> {
        await this.deploymentRepository.delete({ user_id: userId });
    }

    async getStats(userId: string) {
        const deployments = await this.findAll(userId);
        const tenants = await this.tenantRepository.find({ where: { user_id: userId } });

        const timeline: any = {};
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toISOString().split('T')[0];
        }).reverse();

        last7Days.forEach(day => timeline[day] = 0);

        const tenantStats: any = {};
        const resourceTypeStats: any = {};
        const tenantResourceCount: any = {};
        let success = 0;
        let failed = 0;
        let totalResources = 0;
        const alerts: any[] = [];

        // Sort deployments by date for recent activity
        const sorted = [...deployments].sort((a, b) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        deployments.forEach((d) => {
            const date = new Date(d.created_at).toISOString().split('T')[0];
            if (timeline[date] !== undefined) {
                timeline[date]++;
            }

            const tenantName = d.tenant?.name || 'Unknown';
            tenantStats[tenantName] = (tenantStats[tenantName] || 0) + 1;

            if (d.status === DeploymentStatus.SUCCESS) {
                success++;
                const count = d.resources_inventory?.length || 0;
                totalResources += count;
                tenantResourceCount[tenantName] = (tenantResourceCount[tenantName] || 0) + count;
            }
            if (d.status === DeploymentStatus.FAILED) {
                failed++;
                // Add to alerts if it's recent (last 3 days)
                const diffTime = Math.abs(new Date().getTime() - new Date(d.created_at).getTime());
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 3) {
                    alerts.push({
                        type: 'failed',
                        id: d.id,
                        title: d.template?.name || 'Deployment',
                        message: `Failed on ${new Date(d.created_at).toLocaleDateString()}`,
                        tenant: tenantName
                    });
                }
            }

            if (d.template) {
                const rt = d.template.resource_type;
                if (!resourceTypeStats[tenantName]) resourceTypeStats[tenantName] = {};
                resourceTypeStats[tenantName][rt] = (resourceTypeStats[tenantName][rt] || 0) + 1;
            }
        });

        // Optimization: For dashboard, we only show sample alerts for high usage 
        // as fetching real-time CPU for all VMs would be too heavy here.
        // We'll add a placeholder if there are many VMs to suggest review.
        if (totalResources > 10) {
            const vms = deployments.filter(d => 
                d.status === DeploymentStatus.SUCCESS && 
                d.resources_inventory?.some(r => r.type?.includes('virtual_machine'))
            );
            
            if (vms.length > 0) {
                // Heuristic alert: if there are successful VMs, suggest checking them
                // In a real prod environment, we'd pull from Azure Monitor cache here.
                alerts.push({
                    type: 'info',
                    id: 'resource-monitor',
                    title: 'Resource Monitoring',
                    message: `Monitoring ${vms.length} active Virtual Machines for performance metrics.`,
                    tenant: 'All'
                });
            }
        }

        return {
            tenantStats: Object.entries(tenantStats).map(([name, count]) => ({ name, count })),
            resourceTypeStats: Object.entries(resourceTypeStats).map(([tenant, types]: [string, any]) => ({
                tenant,
                ...types
            })),
            tenantResourceCount: Object.entries(tenantResourceCount).map(([name, count]) => ({ name, count })),
            performance: [
                { name: 'Success', value: success, color: 'green.6' },
                { name: 'Failed', value: failed, color: 'red.6' }
            ],
            timeline: Object.entries(timeline).map(([date, count]) => ({ date, count })),
            summary: {
                total: deployments.length,
                success,
                failed,
                tenants: tenants.length,
                totalResources
            },
            alerts: alerts.slice(0, 5),
            recentActivity: sorted.slice(0, 5).map(d => ({
                id: d.id,
                title: d.template?.name || 'Deployment',
                status: d.status,
                date: d.created_at,
                tenant: d.tenant?.name
            }))
        };
    }

    async executeScriptOnResource(
        deploymentId: string,
        userId: string,
        resourceId: string,
        scriptId: string
    ) {
        this.logger.log(`Queueing script ${scriptId} on resource ${resourceId} for deployment ${deploymentId}`);
        const deployment = await this.deploymentRepository.findOne({
            where: { id: deploymentId, user_id: userId },
            relations: ['tenant']
        });
        
        if (!deployment) throw new Error('Deployment not found');

        const tenant = await this.tenantRepository.findOne({
            where: { id: deployment.tenant_id },
            select: ['id', 'tenant_id', 'client_id', 'subscription_id', 'encrypted_client_secret']
        });

        if (!tenant) throw new Error('Tenant not found');

        const script = await this.scriptsService.findOne(scriptId, userId);
        if (!script) throw new Error('Script not found');

        // Find the resource in inventory (CASE-INSENSITIVE)
        const resource = deployment.resources_inventory?.find(r => r.id?.toLowerCase() === resourceId?.toLowerCase());
        if (!resource) {
            throw new Error('Resource not found in inventory');
        }

        if (!resource.type.includes('virtual_machine')) {
            throw new Error('Run Command is only supported on Virtual Machines');
        }

        const isWindows = resource.type.includes('windows');
        const commandId = isWindows ? 'RunPowerShellScript' : 'RunShellScript';
        const decryptedSecret = this.encryptionService.decrypt(tenant.encrypted_client_secret!);

        // Create ScriptExecution record
        const execution = this.scriptExecutionRepository.create({
            deployment_id: deploymentId,
            resource_id: resourceId,
            script_id: scriptId,
            status: ScriptExecutionStatus.PENDING,
        });
        const saved = await this.scriptExecutionRepository.save(execution);

        // Add to queue
        const job = await this.scriptExecutionQueue.add('execute-script', {
            executionId: saved.id,
            credentials: {
                clientId: tenant.client_id.trim(),
                clientSecret: decryptedSecret,
                tenantId: tenant.tenant_id.trim(),
                subscriptionId: tenant.subscription_id.trim(),
            },
            params: {
                resourceGroupName: resource.resource_group,
                vmName: resource.name,
                commandId,
                script: [script.content]
            }
        });

        // Update with job ID
        await this.scriptExecutionRepository.update(saved.id, { job_id: job.id });

        return saved;
    }

    async executeScriptAdHoc(
        tenantId: string,
        userId: string,
        resourceId: string,
        resourceName: string,
        resourceGroupName: string,
        scriptId: string,
        osType: 'Linux' | 'Windows'
    ) {
        this.logger.log(`Queueing ad-hoc script ${scriptId} on resource ${resourceId} for tenant ${tenantId}`);
        
        const tenant = await this.tenantRepository.findOne({
            where: { id: tenantId, user_id: userId },
            select: ['id', 'tenant_id', 'client_id', 'subscription_id', 'encrypted_client_secret']
        });

        if (!tenant) throw new Error('Tenant not found or access denied');

        const script = await this.scriptsService.findOne(scriptId, userId);
        if (!script) throw new Error('Script not found');

        const commandId = osType === 'Windows' ? 'RunPowerShellScript' : 'RunShellScript';
        const decryptedSecret = this.encryptionService.decrypt(tenant.encrypted_client_secret!);

        // Create ScriptExecution record (AD-HOC)
        const execution = this.scriptExecutionRepository.create({
            tenant_id: tenantId,
            resource_id: resourceId,
            script_id: scriptId,
            status: ScriptExecutionStatus.PENDING,
        });
        const saved = await this.scriptExecutionRepository.save(execution);

        // Add to queue
        const job = await this.scriptExecutionQueue.add('execute-script', {
            executionId: saved.id,
            credentials: {
                clientId: tenant.client_id.trim(),
                clientSecret: decryptedSecret,
                tenantId: tenant.tenant_id.trim(),
                subscriptionId: tenant.subscription_id.trim(),
            },
            params: {
                resourceGroupName,
                vmName: resourceName,
                commandId,
                script: [script.content]
            }
        });

        // Update with job ID
        await this.scriptExecutionRepository.update(saved.id, { job_id: job.id });

        return saved;
    }

    async getScriptExecution(id: string, userId: string) {
        const execution = await this.scriptExecutionRepository.findOne({
            where: { id },
            relations: ['deployment', 'script', 'tenant']
        });

        if (!execution) {
            throw new Error('Script execution not found');
        }

        // Validate ownership: either via deployment or via tenant (for ad-hoc)
        const ownerId = execution.deployment?.user_id || execution.tenant?.user_id;
        
        if (ownerId !== userId) {
            throw new Error('Access denied to script execution');
        }

        return execution;
    }

    async updateScriptExecutionStatus(id: string, status: ScriptExecutionStatus, logs?: string) {
        const updateData: any = { status };
        if (logs !== undefined) updateData.logs = logs;
        if (status === ScriptExecutionStatus.SUCCESS || status === ScriptExecutionStatus.FAILED || status === ScriptExecutionStatus.CANCELLED) {
            updateData.finished_at = new Date();
        }
        await this.scriptExecutionRepository.update(id, updateData);
    }

    async stopScriptExecution(id: string, userId: string) {
        const execution = await this.getScriptExecution(id, userId);
        if (execution.status !== ScriptExecutionStatus.RUNNING && execution.status !== ScriptExecutionStatus.PENDING) {
            throw new Error('Execution is not in a cancellable state');
        }

        // 1. Try to kill the BullMQ job
        const job = await this.scriptExecutionQueue.getJob(execution.job_id);
        if (job) {
            await job.remove();
        }

        // 2. Update status
        await this.updateScriptExecutionStatus(id, ScriptExecutionStatus.CANCELLED, 'Execution cancelled by user');

        return { success: true };
    }
}
