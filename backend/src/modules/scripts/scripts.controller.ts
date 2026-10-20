import { Controller, Post, Body, Get, Param, Request, UseGuards, Delete, Patch, NotFoundException } from '@nestjs/common';
import { ScriptsService } from './scripts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OpenAIService } from '../openai/openai.service';
import { GenerateScriptDto } from './dto/generate-script.dto';
import { RefineScriptDto } from './dto/refine-script.dto';

@Controller('scripts')
@UseGuards(JwtAuthGuard)
export class ScriptsController {
    constructor(
        private readonly scriptsService: ScriptsService,
        private readonly openaiService: OpenAIService,
    ) { }

    @Post('generate')
    async generate(@Body() body: GenerateScriptDto) {
        const content = await this.openaiService.generateScript(body.prompt, body.language);
        return { content };
    }

    @Post(':id/refine')
    async refine(@Param('id') id: string, @Body() body: RefineScriptDto, @Request() req: any) {
        const script = await this.scriptsService.findOne(id, req.user.id);
        if (!script) {
            throw new NotFoundException(`Script con id "${id}" no encontrado.`);
        }
        const content = await this.openaiService.refineScript(script.content, body.prompt, script.language);
        return { content };
    }

    @Post()
    async create(@Body() data: any, @Request() req: any) {
        return this.scriptsService.create(req.user.id, data);
    }

    @Get()
    async findAll(@Request() req: any) {
        return this.scriptsService.findAll(req.user.id);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req: any) {
        return this.scriptsService.findOne(id, req.user.id);
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() data: any, @Request() req: any) {
        return this.scriptsService.update(id, req.user.id, data);
    }

    @Delete(':id')
    async remove(@Param('id') id: string, @Request() req: any) {
        return this.scriptsService.remove(id, req.user.id);
    }
}
