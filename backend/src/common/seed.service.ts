import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeedService implements OnModuleInit {
    private readonly logger = new Logger(SeedService.name);

    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    async onModuleInit() {
        await this.seedUsers();
    }

    private async seedUsers() {
        const testUsers = [
            { email: 'admin.pro@terraformars.dev', name: 'Admin Master', password: 'Admin@2026' },
            { email: 'demo@terraformars.dev', name: 'Demo User', password: 'Demo@1234' },
        ];

        for (const userData of testUsers) {
            const exists = await this.usersRepository.findOne({ where: { email: userData.email } });
            if (!exists) {
                const password_hash = await bcrypt.hash(userData.password, 10);
                await this.usersRepository.save({
                    email: userData.email,
                    name: userData.name,
                    password_hash,
                });
                this.logger.log(`✅ SEED: Usuario creado correctamente: ${userData.email}`);
            } else {
                this.logger.log(`⏭️  SEED: El usuario ${userData.email} ya existe.`);
            }
        }
    }
}
