import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { DeploymentsModule } from '../deployments/deployments.module';
import { CommonModule } from '../../common/common.module';

@Module({
    imports: [TenantsModule, DeploymentsModule, CommonModule],
    controllers: [AdminController],
    providers: [AdminService],
    exports: [AdminService],
})
export class AdminModule {}
