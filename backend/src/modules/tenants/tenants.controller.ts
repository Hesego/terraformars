import { Controller, Post, Body, Get, Param, Request, UseGuards, Delete } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('tenants')
@UseGuards(JwtAuthGuard)
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) { }

    @Post()
    async create(@Body() data: any, @Request() req: any) {
        return this.tenantsService.create(req.user.id, data);
    }

    @Get()
    async findAll(@Request() req: any) {
        return this.tenantsService.findAll(req.user.id);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req: any) {
        return this.tenantsService.findOne(id, req.user.id);
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Request() req: any) {
        return this.tenantsService.remove(id, req.user.id);
    }
}
