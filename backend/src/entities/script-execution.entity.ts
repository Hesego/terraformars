import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Deployment } from './deployment.entity';
import { Script } from './script.entity';

import { AzureTenant } from './azure-tenant.entity';

export enum ScriptExecutionStatus {
    PENDING = 'pending',
    RUNNING = 'running',
    SUCCESS = 'success',
    FAILED = 'failed',
    CANCELLED = 'cancelled',
}

@Entity('script_executions')
export class ScriptExecution {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid', nullable: true })
    deployment_id: string;

    @ManyToOne(() => Deployment, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'deployment_id' })
    deployment: Deployment;

    @Column({ type: 'uuid', nullable: true })
    tenant_id: string;

    @ManyToOne(() => AzureTenant, { onDelete: 'CASCADE', nullable: true })
    @JoinColumn({ name: 'tenant_id' })
    tenant: AzureTenant;

    @Column({ type: 'varchar', nullable: true })
    resource_id: string;

    @Column({ type: 'uuid' })
    script_id: string;

    @ManyToOne(() => Script, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'script_id' })
    script: Script;

    @Column({
        type: 'enum',
        enum: ScriptExecutionStatus,
        default: ScriptExecutionStatus.PENDING,
    })
    status: ScriptExecutionStatus;

    @Column({ type: 'text', nullable: true })
    logs: string;

    @Column({ type: 'varchar', nullable: true })
    job_id: string;

    @CreateDateColumn()
    started_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    finished_at: Date;
}
