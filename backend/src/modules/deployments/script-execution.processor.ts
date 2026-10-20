import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { DeploymentsService } from './deployments.service';
import { AzureService } from '../azure/azure.service';
import { ScriptExecutionStatus } from '../../entities/script-execution.entity';

@Processor('script-executions', { concurrency: 5 })
export class ScriptExecutionProcessor extends WorkerHost {

    private readonly logger = new Logger(ScriptExecutionProcessor.name);

    constructor(
        private deploymentsService: DeploymentsService,
        private azureService: AzureService,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        const { executionId, credentials, params } = job.data;

        this.logger.log(`Processing script execution ${executionId}`);

        try {
            // Update status to running
            await this.deploymentsService.updateScriptExecutionStatus(executionId, ScriptExecutionStatus.RUNNING);

            // Execute RunCommand via Azure Service with a 15-minute timeout
            const executionTimeout = 15 * 60 * 1000;
            const result = await Promise.race([
                this.azureService.runCommand(credentials, params),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Script execution timeout after 15 minutes')), executionTimeout)
                )
            ]) as any;

            // Update status to success
            // Azure RunCommand returns an array in 'value' property with execution details
            const output = result.value?.[0]?.message || 'Success (No output message available)';
            await this.deploymentsService.updateScriptExecutionStatus(executionId, ScriptExecutionStatus.SUCCESS, output);

            return result;
        } catch (error) {
            this.logger.error(`Script execution ${executionId} failed: ${error.message}`);
            
            // Handle cancellation specifically if possible
            const status = error.message?.includes('cancel') ? ScriptExecutionStatus.CANCELLED : ScriptExecutionStatus.FAILED;
            await this.deploymentsService.updateScriptExecutionStatus(executionId, status, error.message);
            throw error;
        }
    }
}
