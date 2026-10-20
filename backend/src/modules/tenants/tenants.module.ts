import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TenantsService } from './tenants.service';
import { TenantsController } from './tenants.controller';
import { AzureTenant } from '../../entities/azure-tenant.entity';
import { Deployment } from '../../entities/deployment.entity';
import { AzureModule } from '../azure/azure.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([AzureTenant, Deployment]),
    AzureModule,
  ],
  controllers: [TenantsController],
  providers: [TenantsService],
  exports: [TenantsService],
})
export class TenantsModule {}
