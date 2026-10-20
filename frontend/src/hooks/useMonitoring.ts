import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface MonitoringStatus {
  resourceId: string;
  status?: string;
  provisioningState?: string;
  timestamp: Date;
  details?: any[];
  metrics?: any[];
  totalMemory?: number;
  vmSize?: string;
  error?: string;
}

export function useMonitoring() {
  const [statuses, setStatuses] = useState<Record<string, MonitoringStatus>>({});
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Initialize socket connection
    const socket = io(`${SOCKET_URL}/monitoring`, {
      transports: ['websocket'],
      withCredentials: true,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to monitoring namespace');
    });

    socket.on('statusUpdate', (data: MonitoringStatus) => {
      setStatuses((prev) => ({
        ...prev,
        [data.resourceId]: {
            ...data,
            timestamp: new Date(data.timestamp)
        },
      }));
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from monitoring namespace');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const subscribeToResource = useCallback((payload: {
    tenantId: string;
    resourceId: string;
    resourceType: string;
    resourceName: string;
    resourceGroupName: string;
  }) => {
    if (socketRef.current) {
      socketRef.current.emit('subscribeResource', payload);
    }
  }, []);

  const unsubscribeFromResource = useCallback((resourceId: string) => {
    if (socketRef.current) {
      socketRef.current.emit('unsubscribeResource', { resourceId });
    }
  }, []);

  return {
    statuses,
    subscribeToResource,
    unsubscribeFromResource,
  };
}
