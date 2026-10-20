import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';

export enum ScriptLanguage {
    BASH = 'bash',
    POWERSHELL = 'powershell',
}

@Entity('scripts')
export class Script {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'text' })
    content: string;

    @Column({
        type: 'enum',
        enum: ScriptLanguage,
        default: ScriptLanguage.BASH,
    })
    language: ScriptLanguage;

    @Column({ nullable: true })
    category: string;

    @Column({ type: 'uuid' })
    user_id: string;

    @ManyToOne(() => User, (user) => user.scripts)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @CreateDateColumn()
    created_at: Date;
}
