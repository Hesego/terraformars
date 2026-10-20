import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Script } from '../../entities/script.entity';

@Injectable()
export class ScriptsService {
    private readonly logger = new Logger(ScriptsService.name);

    constructor(
        @InjectRepository(Script)
        private scriptRepository: Repository<Script>,
    ) {}

    async findAll(userId: string): Promise<Script[]> {
        return this.scriptRepository.find({
            where: { user_id: userId },
            order: { created_at: 'DESC' },
        });
    }

    async findOne(id: string, userId: string): Promise<Script | null> {
        return this.scriptRepository.findOne({
            where: { id, user_id: userId },
        });
    }

    async create(userId: string, data: Partial<Script>): Promise<Script> {
        const script = this.scriptRepository.create({
            ...data,
            user_id: userId,
        });
        return this.scriptRepository.save(script);
    }

    async update(id: string, userId: string, data: Partial<Script>): Promise<Script | null> {
        await this.scriptRepository.update({ id, user_id: userId }, data);
        return this.findOne(id, userId);
    }

    async remove(id: string, userId: string): Promise<void> {
        await this.scriptRepository.delete({ id, user_id: userId });
    }
}
