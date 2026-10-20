import { Injectable, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Template } from '../../entities/template.entity';
import { OpenAIService } from '../openai/openai.service';
import { TemplateParserService } from './template-parser.service';

@Injectable()
export class TemplatesService {
    constructor(
        @InjectRepository(Template)
        private templateRepository: Repository<Template>,
        private openaiService: OpenAIService,
        private parserService: TemplateParserService,
    ) { }

    private readonly categories = [
        'Compute',
        'Networking',
        'Storage',
        'Databases',
        'Containers',
        'Security',
        'AI + Machine Learning',
        'Management + Governance',
        'Others'
    ];

    async generate(description: string, userId: string, name?: string): Promise<Partial<Template>> {
        const rawCode = await this.openaiService.generateTerraformTemplate(description);

        // Guard: ensure OpenAI returned usable code
        if (!rawCode?.trim()) {
            throw new InternalServerErrorException(
                'La IA no pudo generar una plantilla válida para esta descripción. Por favor, intenta con más detalles.'
            );
        }
        const code = this.parserService.cleanHCL(rawCode);
        const variables = this.parserService.extractVariables(code);
        const resourceType = this.parserService.detectResourceType(code);
        const estimatedCost = await this.openaiService.estimateCost(code);
        const scalableAttributes = await this.openaiService.detectScalableAttributes(code);

        // Basic category detection
        let category = 'Others';
        const rt = resourceType.toLowerCase();
        if (rt.includes('virtual_machine') || rt.includes('availability_set')) category = 'Compute';
        else if (rt.includes('virtual_network') || rt.includes('subnet') || rt.includes('network_interface') || rt.includes('public_ip')) category = 'Networking';
        else if (rt.includes('storage_account') || rt.includes('storage_container')) category = 'Storage';
        else if (rt.includes('sql') || rt.includes('database') || rt.includes('cosmosdb') || rt.includes('redis')) category = 'Databases';
        else if (rt.includes('kubernetes') || rt.includes('container') || rt.includes('aks')) category = 'Containers';
        else if (rt.includes('key_vault') || rt.includes('security')) category = 'Security';
        else if (rt.includes('cognitive') || rt.includes('openai') || rt.includes('machine_learning')) category = 'AI + Machine Learning';
        else if (rt.includes('resource_group') || rt.includes('policy') || rt.includes('monitor')) category = 'Management + Governance';

        return {
            name: name || `Resource from: ${description.substring(0, 20)}...`,
            description: description,
            terraform_code: code,
            extracted_variables: variables,
            resource_type: resourceType,
            category: category,
            user_id: userId,
            estimated_cost: estimatedCost,
            scalable_attributes: scalableAttributes,
        };
    }

    async save(data: Partial<Template>): Promise<Template> {
        if (data.terraform_code) {
            data.terraform_code = this.parserService.cleanHCL(data.terraform_code);
        }
        const template = this.templateRepository.create(data);
        return this.templateRepository.save(template);
    }

    async estimateCost(code: string): Promise<number> {
        return this.openaiService.estimateCost(code);
    }

    async update(id: string, userId: string, data: Partial<Template>): Promise<Template> {
        const template = await this.findOne(id, userId);
        if (!template) {
            throw new Error('Template not found');
        }

        if (data.terraform_code) {
            data.terraform_code = this.parserService.cleanHCL(data.terraform_code);
            // Re-extract variables if the code was modified
            data.extracted_variables = this.parserService.extractVariables(data.terraform_code);
        }

        Object.assign(template, data);
        return this.templateRepository.save(template);
    }

    async findAll(userId: string) {
        return this.templateRepository.find({ where: { user_id: userId } });
    }

    async findOne(id: string, userId: string) {
        return this.templateRepository.findOne({ where: { id, user_id: userId } });
    }

    async remove(id: string, userId: string) {
        const template = await this.findOne(id, userId);
        if (template) {
            return this.templateRepository.remove(template);
        }
    }
    async refine(id: string, userId: string, prompt: string): Promise<Template> {
        const template = await this.findOne(id, userId);
        if (!template) {
            throw new NotFoundException(`Plantilla con id "${id}" no encontrada.`);
        }

        const rawCode = await this.openaiService.refineTerraformTemplate(template.terraform_code, prompt);
        const code = this.parserService.cleanHCL(rawCode);
        const variables = this.parserService.extractVariables(code);
        const estimatedCost = await this.openaiService.estimateCost(code);
        const scalableAttributes = await this.openaiService.detectScalableAttributes(code);

        template.terraform_code = code;
        template.extracted_variables = variables;
        template.estimated_cost = estimatedCost;
        template.scalable_attributes = scalableAttributes;

        return this.templateRepository.save(template);
    }
}
