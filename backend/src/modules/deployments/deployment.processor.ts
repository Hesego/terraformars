import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { DeploymentsService } from './deployments.service';
import { TerraformService } from '../terraform/terraform.service';
import { TenantsService } from '../tenants/tenants.service';
import { ScriptsService } from '../scripts/scripts.service';
import { DeploymentStatus } from '../../entities/deployment.entity';

@Processor('deployments')
export class DeploymentProcessor extends WorkerHost {
    private readonly logger = new Logger(DeploymentProcessor.name);

    constructor(
        private deploymentsService: DeploymentsService,
        private terraformService: TerraformService,
        private tenantsService: TenantsService,
        private scriptsService: ScriptsService,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const { deploymentId } = job.data;

        this.logger.log(`Processing deployment ${deploymentId}`);

        try {
            // 1. Get deployment details
            const deployment = await this.deploymentsService.findOne(deploymentId, null); // Skip user check for internal process
            if (!deployment) throw new Error('Deployment not found');

            // 2. Update status to running
            await this.deploymentsService.updateStatus(deploymentId, DeploymentStatus.RUNNING);

            // 3. Get tenant credentials (decrypted)
            const tenant = await this.tenantsService.findOne(deployment.tenant_id, deployment.user_id);
            if (!tenant) throw new Error('Tenant not found');

            // 3.5 Get Scripts if any
            let scriptsToInject: any[] = [];
            if (deployment.script_ids && deployment.script_ids.length > 0) {
                const fetchedScripts = await Promise.all(
                    deployment.script_ids.map(id => this.scriptsService.findOne(id, deployment.user_id))
                );
                scriptsToInject = fetchedScripts
                    .filter(s => s !== null)
                    .map(s => ({ name: s!.name, content: s!.content, language: s!.language }));
            }

            // 4. Execute Terraform
            const result = await this.terraformService.executeDeployment(
                deployment.template.terraform_code,
                deployment.parameters,
                {
                    clientId: tenant.client_id,
                    clientSecret: tenant.encrypted_client_secret!,
                    tenantId: tenant.tenant_id,
                    subscriptionId: tenant.subscription_id,
                },
                scriptsToInject,
                (chunk) => {
                    this.deploymentsService.appendLogs(deploymentId, chunk).catch(err =>
                        this.logger.error(`Failed to append logs for ${deploymentId}: ${err.message}`)
                    );
                }
            );

            // 5. Update status based on result
            await this.deploymentsService.updateStatus(
                deploymentId,
                result.success ? DeploymentStatus.SUCCESS : DeploymentStatus.FAILED,
                result.output,
                result.resources
            );

            return result;
        } catch (error) {
            this.logger.error(`Deployment failed: ${error.message}`);
            await this.deploymentsService.updateStatus(deploymentId, DeploymentStatus.FAILED, error.message);
            throw error;
        }
    }
}
