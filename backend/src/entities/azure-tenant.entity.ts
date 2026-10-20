import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Deployment } from './deployment.entity';

@Entity('azure_tenants')
export class AzureTenant {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column()
    tenant_id: string;

    @Column()
    client_id: string;

    @Column()
    subscription_id: string;

    @Column({ select: false })
    encrypted_client_secret: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @ManyToOne(() => User, (user) => user.tenants)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @OneToMany(() => Deployment, (deployment) => deployment.tenant)
    deployments: Deployment[];

    @CreateDateColumn()
    created_at: Date;
}
