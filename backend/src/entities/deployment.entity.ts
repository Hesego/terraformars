import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Template } from './template.entity';
import { AzureTenant } from './azure-tenant.entity';

export enum DeploymentStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    SUCCESS = 'success',
    FAILED = 'failed',
}

@Entity('deployments')
export class Deployment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'jsonb' })
    parameters: any;

    @Column({ type: 'jsonb', nullable: true })
    script_ids: string[];

    @Column({ type: 'jsonb', nullable: true })
    resources_inventory: any[];

    @Column({
        type: 'enum',
        enum: DeploymentStatus,
        default: DeploymentStatus.PENDING,
    })
    status: DeploymentStatus;

    @Column({ type: 'text', nullable: true })
    logs: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @ManyToOne(() => User, (user) => user.deployments)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'uuid' })
    template_id: string;

    @ManyToOne(() => Template, (template) => template.deployments)
    @JoinColumn({ name: 'template_id' })
    template: Template;

    @Column({ type: 'uuid' })
    tenant_id: string;

    @ManyToOne(() => AzureTenant, (tenant) => tenant.deployments)
    @JoinColumn({ name: 'tenant_id' })
    tenant: AzureTenant;

    @CreateDateColumn()
    created_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    finished_at: Date;
}
