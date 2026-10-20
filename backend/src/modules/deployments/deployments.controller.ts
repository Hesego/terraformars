import { Controller, Post, Body, Get, Param, Request, Delete, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { DeploymentsService } from './deployments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('deployments')
@UseGuards(JwtAuthGuard)
export class DeploymentsController {
    constructor(private readonly deploymentsService: DeploymentsService) { }

    @Get('stats')
    async getStats(@Request() req: any) {
        return this.deploymentsService.getStats(req.user.id);
    }

    @Post()
    async create(@Body() data: any, @Request() req: any) {
        return this.deploymentsService.create(req.user.id, data);
    }

    @Get()
    async findAll(@Request() req: any) {
        return this.deploymentsService.findAll(req.user.id);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req: any) {
        return this.deploymentsService.findOne(id, req.user.id);
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Request() req: any) {
        return this.deploymentsService.remove(id, req.user.id);
    }

    @Delete()
    async removeAll(@Request() req: any) {
        return this.deploymentsService.removeAll(req.user.id);
    }

    @Post(':id/execute-script')
    async executeScript(
        @Param('id') id: string,
        @Body() body: { resourceId: string, scriptId: string },
        @Request() req: any
    ) {
        try {
            return await this.deploymentsService.executeScriptOnResource(
                id,
                req.user.id,
                body.resourceId,
                body.scriptId
            );
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }

    @Get('script-executions/:executionId')
    async getScriptExecution(
        @Param('executionId') executionId: string,
        @Request() req: any
    ) {
        try {
            return await this.deploymentsService.getScriptExecution(executionId, req.user.id);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.NOT_FOUND);
        }
    }

    @Post('script-executions/:executionId/stop')
    async stopScriptExecution(
        @Param('executionId') executionId: string,
        @Request() req: any
    ) {
        try {
            return await this.deploymentsService.stopScriptExecution(executionId, req.user.id);
        } catch (error) {
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }
}
