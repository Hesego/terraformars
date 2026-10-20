import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { AppServiceService } from './appservice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('appservice')
@UseGuards(JwtAuthGuard)
export class AppServiceController {
    constructor(private appServiceService: AppServiceService) {}

    @Post(':tenantId/:resourceGroup/:name/command')
    async executeCommand(
        @Param('tenantId') tenantId: string,
        @Param('resourceGroup') resourceGroup: string,
        @Param('name') name: string,
        @Body('command') command: string,
        @Req() req: any,
        @Body('dir') dir?: string
    ) {
        return this.appServiceService.executeCommand(tenantId, req.user.id, resourceGroup, name, command, dir);
    }

    @Get(':tenantId/:resourceGroup/:name/logs')
    async getLogs(
        @Param('tenantId') tenantId: string,
        @Param('resourceGroup') resourceGroup: string,
        @Param('name') name: string,
        @Req() req: any
    ) {
        return this.appServiceService.getLogStream(tenantId, req.user.id, resourceGroup, name);
    }
}
