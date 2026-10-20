import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Deployment } from './deployment.entity';

@Entity('templates')
export class Template {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text' })
    terraform_code: string;

    @Column({ type: 'jsonb' })
    extracted_variables: any;

    @Column({ type: 'jsonb', nullable: true })
    scalable_attributes: any;

    @Column()
    resource_type: string;

    @Column({ nullable: true })
    category: string;

    @Column({ default: false })
    is_public: boolean;

    @Column({ type: 'uuid' })
    user_id: string;

    @ManyToOne(() => User, (user) => user.templates)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @OneToMany(() => Deployment, (deployment) => deployment.template)
    deployments: Deployment[];

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    estimated_cost: number;

    @CreateDateColumn()
    created_at: Date;
}
