import { Module } from '@nestjs/common';
import { MonitoringGateway } from './monitoring.gateway';
import { MonitoringService } from './monitoring.service';
import { TenantsModule } from '../tenants/tenants.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TenantsModule, AuthModule],
  providers: [MonitoringGateway, MonitoringService],
  exports: [MonitoringService],
})
export class MonitoringModule {}
