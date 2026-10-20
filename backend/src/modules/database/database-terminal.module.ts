import { Module } from '@nestjs/common';
import { DatabaseTerminalGateway } from './database-terminal.gateway';
import { DatabaseTerminalService } from './database-terminal.service';
import { AuthModule } from '../auth/auth.module';
import { DeploymentsModule } from '../deployments/deployments.module';

@Module({
  imports: [
    AuthModule,
    DeploymentsModule,
  ],
  providers: [
    DatabaseTerminalGateway,
    DatabaseTerminalService,
  ],
})
export class DatabaseTerminalModule {}
