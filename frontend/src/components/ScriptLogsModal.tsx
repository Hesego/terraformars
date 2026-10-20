import { Modal, Text, Box, ScrollArea, Badge, Group, Stack, Button, Progress, Loader, Paper } from '@mantine/core';
import { useState, useEffect, useRef } from 'react';
import { DeploymentAppService } from '@/services/api';
import { IconTerminal2, IconPlayerStop, IconCircleCheck, IconCircleX, IconClock } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';

interface ScriptLogsModalProps {
    opened: boolean;
    onClose: () => void;
    executionId: string | null;
}

export function ScriptLogsModal({ opened, onClose, executionId }: ScriptLogsModalProps) {
    const [execution, setExecution] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [stopping, setStopping] = useState(false);
    const viewport = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    const scrollToBottom = () => {
        if (viewport.current) {
            viewport.current.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' });
        }
    };

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (opened && executionId) {
            fetchStatus();
            interval = setInterval(fetchStatus, 3000); // Poll every 3 seconds
        } else if (!opened) {
            setExecution(null);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [opened, executionId]);

    useEffect(() => {
        if (execution?.logs) {
            scrollToBottom();
        }
    }, [execution?.logs]);

    const fetchStatus = async () => {
        if (!executionId) return;
        try {
            const data = await DeploymentAppService.getScriptExecution(executionId);
            setExecution(data);
            
            // Auto-stop polling if finished
            if (data.status === 'success' || data.status === 'failed' || data.status === 'cancelled') {
                // The interval will keep running for now, but we could optimize
            }
        } catch (error) {
            console.error('Failed to fetch script status', error);
        }
    };

    const handleStop = async () => {
        if (!executionId) return;
        setStopping(true);
        try {
            await DeploymentAppService.stopScriptExecution(executionId);
            notifications.show({ title: t('common.stopped'), message: t('resources.monitoring.scripts.stopped_msg'), color: 'orange' });
            fetchStatus();
        } catch (error) {
            notifications.show({ title: t('common.error'), message: t('resources.monitoring.scripts.stop_error'), color: 'red' });
        } finally {
            setStopping(false);
        }
    };

    const getStatusConfig = (status: string) => {
        switch (status) {
            case 'pending': return { color: 'gray', icon: <IconClock size={16} />, label: t('resources.monitoring.status.pending') };
            case 'running': return { color: 'blue', icon: <Loader size={12} />, label: t('resources.monitoring.status.running') };
            case 'success': return { color: 'green', icon: <IconCircleCheck size={16} />, label: t('resources.monitoring.status.success') };
            case 'failed': return { color: 'red', icon: <IconCircleX size={16} />, label: t('resources.monitoring.status.failed') };
            case 'cancelled': return { color: 'orange', icon: <IconPlayerStop size={16} />, label: t('resources.monitoring.status.cancelled') };
            default: return { color: 'gray', icon: null, label: status };
        }
    };

    const config = getStatusConfig(execution?.status || 'pending');

    return (
        <Modal 
            opened={opened} 
            onClose={onClose} 
            title={
                <Group gap="xs">
                    <IconTerminal2 size={20} color="var(--mantine-color-terra-filled)" />
                    <Text fw={700} style={{ fontFamily: 'var(--font-outfit)' }}>{t('resources.monitoring.scripts.terminal_title')}</Text>
                </Group>
            }
            size="xl"
            radius="md"
            centered
            overlayProps={{
                backgroundOpacity: 0.55,
                blur: 3,
            }}
        >
            <Stack gap="md">
                <Paper withBorder p="md" radius="sm" bg="var(--mantine-color-dark-8)">
                    <Group justify="space-between">
                        <Stack gap={4}>
                            <Text size="sm" fw={500} c="dimmed">{t('resources.monitoring.scripts.script_label')}: <Text span c="white" fw={600}>{execution?.script?.name || '...'}</Text></Text>
                            <Text size="xs" c="dimmed">ID: {executionId}</Text>
                        </Stack>
                        <Badge color={config.color} variant="light" leftSection={config.icon} size="lg">
                            {config.label}
                        </Badge>
                    </Group>
                    
                    {execution?.status === 'running' && (
                        <Progress value={100} animated mt="md" color="blue" size="sm" />
                    )}
                </Paper>

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
                                minHeight: '200px',
                                whiteSpace: 'pre-wrap',
                                border: '1px solid var(--mantine-color-dark-4)'
                            }}
                        >
                            {execution?.logs || `> ${t('resources.monitoring.scripts.init_msg')}\n> ${t('resources.monitoring.scripts.connect_msg')}...`}
                        </Box>
                    </ScrollArea.Autosize>
                </Box>

                <Group justify="space-between" mt="sm">
                    <Text size="xs" c="dimmed" style={{ maxWidth: '60%' }}>
                        {execution?.status === 'running' ? t('resources.monitoring.scripts.wait_msg') : t('resources.monitoring.scripts.finished_msg')}
                    </Text>
                    <Group>
                        {(execution?.status === 'running' || execution?.status === 'pending') && (
                            <Button 
                                variant="light" 
                                color="red" 
                                leftSection={<IconPlayerStop size={18} />}
                                onClick={handleStop}
                                loading={stopping}
                            >
                                {t('resources.monitoring.scripts.stop_button')}
                            </Button>
                        )}
                        <Button variant="default" onClick={onClose}>
                            {execution?.status === 'running' ? t('common.close_keep_running') : t('common.close')}
                        </Button>
                    </Group>
                </Group>
            </Stack>
        </Modal>
    );
}
