import { Controller, Get, Post, Delete, Param, Body, Req, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) {}

    @Get('resources/:tenantId')
    async getAllResources(@Param('tenantId') tenantId: string, @Req() req: any) {
        return this.adminService.getAllResources(tenantId, req.user.id);
    }

    @Get('vms/:tenantId')
    async listVMs(@Param('tenantId') tenantId: string, @Req() req: any) {
        return this.adminService.listVMs(tenantId, req.user.id);
    }

    @Get('aks/:tenantId')
    async listAKS(@Param('tenantId') tenantId: string, @Req() req: any) {
        return this.adminService.listAKSClusters(tenantId, req.user.id);
    }

    @Get('app-services/:tenantId')
    async listAppServices(@Param('tenantId') tenantId: string, @Req() req: any) {
        return this.adminService.listAppServices(tenantId, req.user.id);
    }

    @Get('vnets/:tenantId')
    async listVNets(@Param('tenantId') tenantId: string, @Req() req: any) {
        return this.adminService.listVNets(tenantId, req.user.id);
    }

    @Get('databases/:tenantId')
    async listDatabases(@Param('tenantId') tenantId: string, @Req() req: any) {
        return this.adminService.listDatabases(tenantId, req.user.id);
    }

    @Post('vnets/:tenantId/connect')
    async connectVNets(
        @Param('tenantId') tenantId: string,
        @Body() body: {
            vnet1: { name: string; resourceGroup: string };
            vnet2: { id: string; name: string };
        },
        @Req() req: any,
    ) {
        return this.adminService.connectVNets(tenantId, req.user.id, body.vnet1, body.vnet2);
    }

    @Delete('vnets/:tenantId/disconnect')
    async disconnectVNet(
        @Param('tenantId') tenantId: string,
        @Body() body: {
            resourceGroup: string;
            vnetName: string;
            peeringName: string;
        },
        @Req() req: any,
    ) {
        return this.adminService.disconnectVNet(
            tenantId,
            req.user.id,
            body.resourceGroup,
            body.vnetName,
            body.peeringName,
        );
    }

    @Post('execute-script/:tenantId')
    async executeScript(
        @Param('tenantId') tenantId: string,
        @Body() body: {
            resourceId: string;
            resourceName: string;
            resourceGroup: string;
            scriptId: string;
            osType: 'Linux' | 'Windows';
        },
        @Req() req: any,
    ) {
        return this.adminService.executeScript(tenantId, req.user.id, body);
    }
}
