import { Module } from '@nestjs/common';
import { AppServiceService } from './appservice.service';
import { AppServiceController } from './appservice.controller';
import { TenantsModule } from '../tenants/tenants.module';

@Module({
    imports: [TenantsModule],
    providers: [AppServiceService],
    controllers: [AppServiceController],
    exports: [AppServiceService],
})
export class AppServiceModule {}
