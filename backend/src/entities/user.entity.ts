import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { AzureTenant } from './azure-tenant.entity';
import { Template } from './template.entity';
import { Deployment } from './deployment.entity';
import { Script } from './script.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  name: string;

  @Column({ select: false })
  password_hash: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => AzureTenant, (tenant) => tenant.user)
  tenants: AzureTenant[];

  @OneToMany(() => Template, (template) => template.user)
  templates: Template[];

  @OneToMany(() => Deployment, (deployment) => deployment.user)
  deployments: Deployment[];

  @OneToMany(() => Script, (script) => script.user)
  scripts: Script[];
}
