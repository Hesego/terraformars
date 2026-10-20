import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseTerminalService } from './database-terminal.service';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: 'database-terminal',
})
export class DatabaseTerminalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(DatabaseTerminalGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly databaseService: DatabaseTerminalService,
    private readonly jwtService: JwtService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const cookieHeader = client.request.headers.cookie;
      const token = cookieHeader?.split(';').find(c => c.trim().startsWith('auth_token='))?.split('=')[1];

      if (!token) throw new Error('Unauthorized');
      
      const payload = await this.jwtService.verifyAsync(token);
      client.data.userId = payload.sub;
      this.logger.log(`DB Terminal ready: ${client.id}`);
    } catch (err) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`DB Terminal closed: ${client.id}`);
  }

  @SubscribeMessage('connect-db')
  async handleConnect(client: Socket, payload: { deploymentId: string }) {
    try {
      const result = await this.databaseService.connect(payload.deploymentId, client.data.userId);
      client.emit('terminal-output', `\n${result}\nUse SQL commands. Type 'logout' to exit.\n`);
    } catch (err) {
      client.emit('terminal-error', err.message);
    }
  }

  @SubscribeMessage('execute-sql')
  async handleExecute(client: Socket, payload: { deploymentId: string; sql: string }) {
    try {
      if (payload.sql.toLowerCase().trim() === 'help') {
          client.emit('terminal-output', 'Available commands: Any valid PostgreSQL SQL query (SELECT, INSERT, UPDATE, etc).');
          return;
      }
      
      const output = await this.databaseService.executeQuery(payload.deploymentId, client.data.userId, payload.sql);
      client.emit('terminal-output', `\n${output}\n`);
    } catch (err) {
      client.emit('terminal-error', err.message);
    }
  }

  @SubscribeMessage('disconnect-db')
  async handleDisconnectDB(client: Socket, payload: { deploymentId: string }) {
    await this.databaseService.disconnect(payload.deploymentId, client.data.userId);
    client.emit('terminal-output', 'Connection closed.');
  }
}
