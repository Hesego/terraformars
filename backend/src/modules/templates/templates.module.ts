import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TemplatesService } from './templates.service';
import { TemplatesController } from './templates.controller';
import { TemplateParserService } from './template-parser.service';
import { Template } from '../../entities/template.entity';
import { OpenAIModule } from '../openai/openai.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Template]),
    OpenAIModule,
  ],
  controllers: [TemplatesController],
  providers: [TemplatesService, TemplateParserService],
  exports: [TemplatesService],
})
export class TemplatesModule {}
