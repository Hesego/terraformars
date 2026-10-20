import { Controller, Get, Param, Query, UseGuards, Req } from '@nestjs/common';
import { K8sService } from './k8s.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('k8s')
@UseGuards(JwtAuthGuard)
export class K8sController {
    constructor(private k8sService: K8sService) {}

    @Get(':tenantId/:resourceGroup/:clusterName/pods')
    async getPods(
        @Param('tenantId') tenantId: string,
        @Param('resourceGroup') resourceGroup: string,
        @Param('clusterName') clusterName: string,
        @Req() req: any,
        @Query('namespace') namespace?: string
    ) {
        return this.k8sService.getPods(tenantId, req.user.id, resourceGroup, clusterName, namespace);
    }

    @Get(':tenantId/:resourceGroup/:clusterName/nodes')
    async getNodes(
        @Param('tenantId') tenantId: string,
        @Param('resourceGroup') resourceGroup: string,
        @Param('clusterName') clusterName: string,
        @Req() req: any
    ) {
        return this.k8sService.getNodes(tenantId, req.user.id, resourceGroup, clusterName);
    }

    @Get(':tenantId/:resourceGroup/:clusterName/services')
    async getServices(
        @Param('tenantId') tenantId: string,
        @Param('resourceGroup') resourceGroup: string,
        @Param('clusterName') clusterName: string,
        @Req() req: any,
        @Query('namespace') namespace?: string
    ) {
        return this.k8sService.getServices(tenantId, req.user.id, resourceGroup, clusterName, namespace);
    }
}
