import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { User } from './entities/user.entity';
import { AzureTenant } from './entities/azure-tenant.entity';
import { Template } from './entities/template.entity';
import { Deployment } from './entities/deployment.entity';
import { Script } from './entities/script.entity';
import { ScriptExecution } from './entities/script-execution.entity';
import { SeedService } from './common/seed.service';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { ScriptsModule } from './modules/scripts/scripts.module';
import { OpenAIModule } from './modules/openai/openai.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { DeploymentsModule } from './modules/deployments/deployments.module';
import { TerraformModule } from './modules/terraform/terraform.module';
import { AzureModule } from './modules/azure/azure.module';
import { AdminModule } from './modules/admin/admin.module';
import { K8sModule } from './modules/k8s/k8s.module';
import { AppServiceModule } from './modules/appservice/appservice.module';
import { DatabaseTerminalModule } from './modules/database/database-terminal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DB_HOST'),
        port: config.get<number>('DB_PORT'),
        username: config.get<string>('DB_USERNAME'),
        password: config.get<string>('DB_PASSWORD'),
        database: config.get<string>('DB_DATABASE'),
        entities: [User, AzureTenant, Template, Deployment, Script, ScriptExecution],
        synchronize: true,
      }),
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST'),
          port: config.get<number>('REDIS_PORT'),
          password: config.get<string>('REDIS_PASSWORD'),
        },
      }),
    }),
    TypeOrmModule.forFeature([User]),
    CommonModule,
    OpenAIModule,
    AuthModule,
    ScriptsModule,
    TenantsModule,
    TemplatesModule,
    DeploymentsModule,
    TerraformModule,
    AzureModule,
    AdminModule,
    MonitoringModule,
    K8sModule,
    AppServiceModule,
    DatabaseTerminalModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 200, // 200 requests per minute per IP (normal usage)
    }]),
  ],
  controllers: [],
  providers: [
    SeedService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule { }
