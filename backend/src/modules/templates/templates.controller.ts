import { Controller, Post, Body, Get, Param, UseGuards, Request, Delete, Patch } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('templates')
@UseGuards(JwtAuthGuard)
export class TemplatesController {
    constructor(private readonly templatesService: TemplatesService) { }

    @Post('generate')
    async generate(@Request() req: any, @Body('description') description: string, @Body('name') name?: string) {
        return this.templatesService.generate(description, req.user.id, name);
    }

    @Post('reestimate-cost')
    async reestimateCost(@Body('terraform_code') terraformCode: string) {
        const cost = await this.templatesService.estimateCost(terraformCode);
        return { estimated_cost: cost };
    }

    @Post()
    async save(@Body() data: any, @Request() req: any) {
        return this.templatesService.save({ ...data, user_id: req.user.id });
    }

    @Get()
    async findAll(@Request() req: any) {
        return this.templatesService.findAll(req.user.id);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() data: any, @Request() req: any) {
        return this.templatesService.update(id, req.user.id, data);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req: any) {
        return this.templatesService.findOne(id, req.user.id);
    }

    @Post(':id/refine')
    async refine(@Param('id') id: string, @Body('prompt') prompt: string, @Request() req: any) {
        return this.templatesService.refine(id, req.user.id, prompt);
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Request() req: any) {
        return this.templatesService.remove(id, req.user.id);
    }
}
