import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Script } from '../../entities/script.entity';
import { ScriptsService } from './scripts.service';
import { ScriptsController } from './scripts.controller';
import { OpenAIService } from '../openai/openai.service';
import { OpenAIModule } from '../openai/openai.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Script]),
        OpenAIModule,
    ],
    controllers: [ScriptsController],
    providers: [ScriptsService],
    exports: [ScriptsService],
})
export class ScriptsModule { }
