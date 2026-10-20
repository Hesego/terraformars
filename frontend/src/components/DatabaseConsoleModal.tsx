import { Modal, Text, Box, ScrollArea, Group, Stack, Button, TextInput, Paper, ActionIcon, Tooltip } from '@mantine/core';
import { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { IconDatabase, IconSend, IconTrash, IconTerminal2, IconHistory } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';

interface DatabaseConsoleModalProps {
    opened: boolean;
    onClose: () => void;
    deploymentId: string;
    resourceName: string;
}

export function DatabaseConsoleModal({ opened, onClose, deploymentId, resourceName }: DatabaseConsoleModalProps) {
    const { t } = useTranslation();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [input, setInput] = useState('');
    const [history, setHistory] = useState<string[]>([]);
    const [output, setOutput] = useState<string[]>([]);
    const [connecting, setConnecting] = useState(false);
    const viewport = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (viewport.current) {
            viewport.current.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        if (opened && deploymentId) {
            const apiUri = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
            const newSocket = io(`${apiUri}/database-terminal`, {
                withCredentials: true,
                transports: ['websocket'],
            });

            newSocket.on('connect', () => {
                setConnecting(true);
                newSocket.emit('connect-db', { deploymentId });
            });

            newSocket.on('terminal-output', (data: string) => {
                setOutput(prev => [...prev, data]);
                setConnecting(false);
            });

            newSocket.on('terminal-error', (error: string) => {
                setOutput(prev => [...prev, `\nERROR: ${error}\n`]);
                notifications.show({ title: 'Error', message: error, color: 'red' });
                setConnecting(false);
            });

            setSocket(newSocket);

            return () => {
                newSocket.disconnect();
            };
        }
    }, [opened, deploymentId]);

    useEffect(() => {
        scrollToBottom();
    }, [output]);

    const handleSend = () => {
        if (!input.trim() || !socket) return;
        
        socket.emit('execute-sql', { deploymentId, sql: input });
        setHistory(prev => [input, ...prev].slice(0, 50));
        setInput('');
    };

    const handleClear = () => {
        setOutput(['\n--- Terminal Cleared ---\n']);
    };

    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            title={
                <Group gap="xs">
                    <IconDatabase size={20} color="var(--mantine-color-jhamf-6)" />
                    <Text fw={700}>Consola SQL: {resourceName}</Text>
                </Group>
            }
            size="xl"
            radius="md"
            centered
        >
            <Stack gap="md">
                <Box style={{ position: 'relative' }}>
                    <ScrollArea.Autosize mah={400} viewportRef={viewport} type="always" offsetScrollbars>
                        <Box 
                            p="md" 
                            bg="black" 
                            style={{ 
                                borderRadius: '4px', 
                                fontFamily: 'monospace', 
                                fontSize: '13px', 
                                color: '#00FF00',
                                minHeight: '300px',
                                whiteSpace: 'pre-wrap',
                                border: '1px solid var(--mantine-color-dark-4)'
                            }}
                        >
                            {output.length === 0 ? '> Conectando con la base de datos...' : output.join('')}
                        </Box>
                    </ScrollArea.Autosize>
                </Box>

                <Paper p="xs" withBorder radius="sm">
                    <Group align="flex-end" gap="xs">
                        <TextInput 
                            style={{ flex: 1 }}
                            placeholder="Ingrese comando SQL (ej: SELECT * FROM table;)"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            leftSection={<IconTerminal2 size={16} />}
                            disabled={connecting}
                        />
                        <Tooltip label="Limpiar Consola">
                            <ActionIcon variant="light" color="gray" size="lg" onClick={handleClear}>
                                <IconTrash size={20} />
                            </ActionIcon>
                        </Tooltip>
                        <Button 
                            color="jhamf" 
                            onClick={handleSend} 
                            loading={connecting}
                            leftSection={<IconSend size={18} />}
                        >
                            Ejecutar
                        </Button>
                    </Group>
                </Paper>
            </Stack>
        </Modal>
    );
}
