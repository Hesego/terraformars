import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AzureTenant } from '../../entities/azure-tenant.entity';
import { Deployment } from '../../entities/deployment.entity';
import { EncryptionService } from '../../common/encryption.service';
import { AzureService } from '../azure/azure.service';

@Injectable()
export class TenantsService {
    constructor(
        @InjectRepository(AzureTenant)
        private tenantRepository: Repository<AzureTenant>,
        @InjectRepository(Deployment)
        private deploymentRepository: Repository<Deployment>,
        private encryptionService: EncryptionService,
        private azureService: AzureService,
    ) { }

    async create(userId: string, data: any): Promise<AzureTenant> {
        const encryptedSecret = this.encryptionService.encrypt(data.client_secret.trim());
        const tenant = this.tenantRepository.create({
            ...data,
            tenant_id: data.tenant_id.trim(),
            client_id: data.client_id.trim(),
            subscription_id: data.subscription_id.trim(),
            user_id: userId,
            encrypted_client_secret: encryptedSecret,
        });
        return this.tenantRepository.save(tenant) as unknown as Promise<AzureTenant>;
    }

    async findAll(userId: string): Promise<AzureTenant[]> {
        return this.tenantRepository.find({ where: { user_id: userId } });
    }

    async findOne(id: string, userId: string | null): Promise<AzureTenant | null> {
        const where: any = { id };
        if (userId) where.user_id = userId;

        const tenant = await this.tenantRepository.findOne({
            where,
            select: ['id', 'name', 'tenant_id', 'client_id', 'subscription_id', 'encrypted_client_secret'],
        });

        if (tenant) {
            tenant.encrypted_client_secret = this.encryptionService.decrypt(tenant.encrypted_client_secret);
        }

        return tenant;
    }

    async remove(id: string, userId: string): Promise<void> {
        const tenant = await this.findOne(id, userId);
        if (tenant) {
            // 1. Delete deployments from DB
            await this.deploymentRepository.delete({ tenant_id: id, user_id: userId });

            // 2. Delete tenant
            await this.tenantRepository.remove(tenant);
        }
    }
}
