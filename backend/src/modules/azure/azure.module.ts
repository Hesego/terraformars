import { Module } from '@nestjs/common';
import { AzureService } from './azure.service';

@Module({
    providers: [AzureService],
    exports: [AzureService],
})
export class AzureModule { }
