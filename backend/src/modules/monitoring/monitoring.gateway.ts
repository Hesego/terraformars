import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'monitoring',
})
export class MonitoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(MonitoringGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly jwtService: JwtService
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Extract from cookie header
      const cookieHeader = client.request.headers.cookie;
      const tokenString = cookieHeader?.split(';').find(c => c.trim().startsWith('auth_token='));
      const token = tokenString ? tokenString.split('=')[1] : null;

      if (!token) throw new Error('No token provided in cookies');
      
      const payload = await this.jwtService.verifyAsync(token);
      client.data.userId = payload.sub; // Store userId in socket data
      this.logger.log(`Client connected: ${client.id}, User: ${payload.sub}`);
    } catch (err) {
      this.logger.warn(`Unauthorized WebSocket connection attempt: ${client.id} - ${err.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.monitoringService.unsubscribeClient(client.id);
  }

  @SubscribeMessage('subscribeResource')
  async handleSubscribe(client: Socket, payload: { tenantId: string; resourceId: string; resourceType: string; resourceName: string; resourceGroupName: string }) {
    this.logger.log(`Client ${client.id} subscribing to resource ${payload.resourceName}`);
    
    // Join a room for this resource to allow targeted updates
    const roomName = `resource:${payload.resourceId}`;
    client.join(roomName);

    // Initial status fetch and start polling if not already polling
    // Pass the verified userId from the socket data to enforce isolation
    await this.monitoringService.subscribeClient(client.id, { ...payload, userId: client.data.userId }, (data) => {
      this.server.to(roomName).emit('statusUpdate', data);
    });
    
    return { status: 'subscribed', room: roomName };
  }

  @SubscribeMessage('unsubscribeResource')
  handleUnsubscribe(client: Socket, payload: { resourceId: string }) {
    const roomName = `resource:${payload.resourceId}`;
    client.leave(roomName);
    this.monitoringService.unsubscribeClient(client.id, payload.resourceId);
    return { status: 'unsubscribed' };
  }
}
