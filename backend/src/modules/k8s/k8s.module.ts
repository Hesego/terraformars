import { Module } from '@nestjs/common';
import { K8sService } from './k8s.service';
import { K8sController } from './k8s.controller';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
    imports: [TenantsModule],
    providers: [K8sService],
    controllers: [K8sController],
    exports: [K8sService],
})
export class K8sModule {}
