import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DeploymentsService } from './deployments.service';
import { DeploymentsController } from './deployments.controller';
import { DeploymentProcessor } from './deployment.processor';
import { ScriptExecutionProcessor } from './script-execution.processor';
import { Deployment } from '../../entities/deployment.entity';
import { ScriptExecution } from '../../entities/script-execution.entity';
import { AzureTenant } from '../../entities/azure-tenant.entity';
import { TerraformModule } from '../terraform/terraform.module';
import { TenantsModule } from '../tenants/tenants.module';
import { ScriptsModule } from '../scripts/scripts.module';
import { AzureModule } from '../azure/azure.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Deployment, AzureTenant, ScriptExecution]),
    BullModule.registerQueue(
      { name: 'deployments' },
      { name: 'script-executions' }
    ),
    TerraformModule,
    TenantsModule,
    ScriptsModule,
    AzureModule,
  ],
  controllers: [DeploymentsController],
  providers: [DeploymentsService, DeploymentProcessor, ScriptExecutionProcessor],
  exports: [DeploymentsService],
})
export class DeploymentsModule {}
