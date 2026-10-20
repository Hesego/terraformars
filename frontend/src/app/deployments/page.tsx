'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
    Title,
    Text,
    Stack,
    Card,
    Badge,
    Group,
    Loader,
    Center,
    Table,
    ActionIcon,
    Tooltip,
    Modal,
    Code,
    ScrollArea,
    Box,
    useMantineColorScheme,
    Tabs,
    SimpleGrid,
    ThemeIcon,
    Select,
    Divider,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconTerminal2, IconRefresh, IconCircleCheck, IconCircleX, IconLoader2, IconTrash, IconBulb, IconAlertTriangle, IconDeviceDesktop, IconServer, IconBox, IconAdjustments, IconPlayerPlay } from '@tabler/icons-react';
import { DeploymentAppService, ScriptAppService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { notifications } from '@mantine/notifications';
import { Button, Alert } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useTranslation } from 'react-i18next';
import { maskAzurePath } from '@/utils/masking';

const getStatusColor = (status: string) => {
    switch (status) {
        case 'pending': return 'gray';
        case 'running': return 'blue';
        case 'success': return 'green';
        case 'failed': return 'red';
        default: return 'gray';
    }
};

const getStatusIcon = (status: string) => {
    switch (status) {
        case 'success': return <IconCircleCheck size={16} />;
        case 'failed': return <IconCircleX size={16} />;
        case 'running': return <IconLoader2 size={16} className="animate-spin" />;
        default: return null;
    }
};

const formatDuration = (start: string, end?: string) => {
    if (!end) return '---';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diff = Math.floor((e - s) / 1000);
    if (diff < 60) return `${diff}s`;
    const min = Math.floor(diff / 60);
    const sec = diff % 60;
    return `${min}m ${sec}s`;
};

const getSmartAdvice = (logs: string, t: any) => {
    if (!logs) return null;
    const l = logs.toLowerCase();

    if (l.includes('netcfgsubnetrangesoverlap')) {
        return {
            title: t('modals.logs.advice.overlap_title'),
            message: t('modals.logs.advice.overlap_msg'),
            color: 'orange'
        };
    }
    if (l.includes('invalidsubscriptionid') || l.includes('malformed')) {
        return {
            title: t('modals.logs.advice.sub_id_title'),
            message: t('modals.logs.advice.sub_id_msg'),
            color: 'red'
        };
    }
    if (l.includes('authorizationfailed') || l.includes('403')) {
        return {
            title: t('modals.logs.advice.auth_title'),
            message: t('modals.logs.advice.auth_msg'),
            color: 'red'
        };
    }
    if (l.includes('resourcenotfound') || l.includes('404') || l.includes('invalidresourcereference')) {
        return {
            title: t('modals.logs.advice.not_found_title'),
            message: t('modals.logs.advice.not_found_msg'),
            color: 'orange'
        };
    }

    if (l.includes('quotaexceeded')) {
        return {
            title: t('modals.logs.advice.quota_title'),
            message: t('modals.logs.advice.quota_msg'),
            color: 'yellow'
        };
    }
    if (l.includes('unreadable module directory') || l.includes('no such file or directory')) {
        return {
            title: t('modals.logs.advice.module_title'),
            message: t('modals.logs.advice.module_msg'),
            color: 'red'
        };
    }
    return {
        title: t('modals.logs.advice.generic_title'),
        message: t('modals.logs.advice.generic_msg'),
        color: 'gray'
    };
};

export default function DeploymentsPage() {
    const [deployments, setDeployments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDeployment, setSelectedDeployment] = useState<any>(null);
    const [opened, { open, close }] = useDisclosure(false);
    const [scripts, setScripts] = useState<any[]>([]);
    const [executingResourceId, setExecutingResourceId] = useState<string | null>(null);
    const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string | null>('logs');

    const { user, isLoading: authLoading } = useAuth();
    const { t } = useTranslation();
    const { colorScheme } = useMantineColorScheme();

    useEffect(() => {
        if (user) {
            fetchDeployments();
            fetchScripts();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
        const interval = setInterval(() => {
            if (user) fetchDeployments();
        }, 3000); // Polling faster during implementation
        return () => clearInterval(interval);
    }, [user, authLoading]);

    useEffect(() => {
        if (selectedDeployment && opened) {
            const updated = deployments.find(d => d.id === selectedDeployment.id);
            if (updated) setSelectedDeployment(updated);
        }
    }, [deployments, opened]);

    const fetchDeployments = async () => {
        try {
            const data = await DeploymentAppService.list();
            setDeployments(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchScripts = async () => {
        try {
            const data = await ScriptAppService.list();
            setScripts(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleExecuteScript = async (resourceId: string) => {
        if (!selectedScriptId) {
            notifications.show({ title: 'Error', message: 'Selecciona un script primero', color: 'red' });
            return;
        }
        setExecutingResourceId(resourceId);
        try {
            const result = await DeploymentAppService.executeScript(selectedDeployment.id, resourceId, selectedScriptId);
            
            // Extract messages from Azure result
            const output = result.value?.map((v: any) => v.message).join('\n') || 'Script ejecutado, pero no se recibió salida.';

            modals.open({
                title: 'Resultado de Ejecución',
                size: 'lg',
                radius: 'md',
                children: (
                    <Stack>
                        <Alert color="green" icon={<IconCircleCheck size={18} />}>
                            El comando se completó con éxito en Azure.
                        </Alert>
                        <Text size="sm" fw={500}>Salida del Sistema:</Text>
                        <Code block p="md" style={{ borderRadius: '8px', fontSize: '12px' }}>
                            {output}
                        </Code>
                    </Stack>
                )
            });
        } catch (error: any) {
            const msg = error.response?.data?.message || 'Error al ejecutar el script';
            notifications.show({ title: 'Error', message: msg, color: 'red' });
        } finally {
            setExecutingResourceId(null);
        }
    };

    const handleViewLogs = (deployment: any) => {
        setSelectedDeployment(deployment);
        open();
    };

    const handleDelete = (id: string) => {
        modals.openConfirmModal({
            title: t('common.confirm_action'),
            centered: true,
            children: <Text size="sm">Are you sure you want to delete this deployment record?</Text>,
            labels: { confirm: t('common.delete'), cancel: t('common.cancel') },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                try {
                    await DeploymentAppService.delete(id);
                    notifications.show({ title: t('common.success'), message: 'Deployment record removed', color: 'green' });
                    fetchDeployments();
                } catch (error) {
                    notifications.show({ title: t('common.error'), message: 'Failed to delete record', color: 'red' });
                }
            }
        });
    };

    const handleClearAll = () => {
        modals.openConfirmModal({
            title: t('common.confirm_action'),
            centered: true,
            children: <Text size="sm">Are you sure you want to clear all deployment records? This cannot be undone.</Text>,
            labels: { confirm: t('common.delete'), cancel: t('common.cancel') },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                try {
                    await DeploymentAppService.deleteAll();
                    notifications.show({ title: t('common.success'), message: 'All records cleared', color: 'green' });
                    fetchDeployments();
                } catch (error) {
                    notifications.show({ title: t('common.error'), message: 'Failed to clear records', color: 'red' });
                }
            }
        });
    };

    if (authLoading || (loading && deployments.length === 0)) return (
        <DashboardLayout>
            <Center h="100vh"><Loader color="jhamf.6" /></Center>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <Stack>
                <Group justify="space-between">
                    <Stack gap={0}>
                        <Title order={2}>{t('deployments.title')}</Title>
                        <Text c="dimmed">{t('deployments.subtitle')}</Text>
                    </Stack>
                    <Group>
                        {deployments.length > 0 && (
                            <Button
                                variant="subtle"
                                color="red"
                                leftSection={<IconTrash size={16} />}
                                onClick={handleClearAll}
                            >
                                {t('deployments.clear_all')}
                            </Button>
                        )}
                        <ActionIcon variant="light" onClick={fetchDeployments}>
                            <IconRefresh size={18} />
                        </ActionIcon>
                    </Group>
                </Group>

                <Card withBorder className="glass-card" style={{ borderRadius: '24px' }} p={0} mb="xl">
                    <Table.ScrollContainer minWidth={800}>
                        <Table verticalSpacing="md" highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>{t('deployments.template')}</Table.Th>
                                    <Table.Th>{t('deployments.tenant')}</Table.Th>
                                    <Table.Th>{t('common.status')}</Table.Th>
                                    <Table.Th>{t('common.date')}</Table.Th>
                                    <Table.Th>Duración</Table.Th>
                                    <Table.Th style={{ textAlign: 'right' }}>{t('common.actions')}</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {deployments.map((d) => (
                                    <Table.Tr key={d.id}>
                                        <Table.Td>
                                            <Text size="sm" fw={500}>{d.template?.name || 'Deleted Template'}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{d.tenant?.name || 'Internal'}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge
                                                color={getStatusColor(d.status)}
                                                variant="light"
                                                leftSection={getStatusIcon(d.status)}
                                            >
                                                {d.status}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm" c="dimmed">
                                                {new Date(d.created_at).toLocaleString()}
                                            </Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge variant="dot" color="jhamf.4">
                                                {formatDuration(d.created_at, d.finished_at)}
                                            </Badge>
                                        </Table.Td>
                                        <Table.Td>
                                            <Group gap="xs" justify="flex-end">
                                                <Tooltip label="View Execution Logs">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="jhamf.6"
                                                        onClick={() => handleViewLogs(d)}
                                                    >
                                                        <IconTerminal2 size={18} />
                                                    </ActionIcon>
                                                </Tooltip>
                                                <Tooltip label="Delete Record">
                                                    <ActionIcon
                                                        variant="subtle"
                                                        color="red"
                                                        onClick={() => handleDelete(d.id)}
                                                    >
                                                        <IconTrash size={18} />
                                                    </ActionIcon>
                                                </Tooltip>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                </Card>

                {deployments.length === 0 && (
                    <Center p="xl">
                        <Text c="dimmed">No deployments found.</Text>
                    </Center>
                )}
            </Stack>

            <Modal
                opened={opened}
                onClose={close}
                title={
                    <Group gap="xs">
                        <IconTerminal2 size={20} />
                        <Text fw={600}>{t('modals.logs.title')}</Text>
                        <Badge color={getStatusColor(selectedDeployment?.status)} variant="light" size="sm">
                            {selectedDeployment?.status}
                        </Badge>
                    </Group>
                }
                size="xl"
                radius="md"
            >
                <Tabs value={activeTab} onChange={setActiveTab} color="jhamf">
                    <Tabs.List mb="md">
                        <Tabs.Tab value="logs" leftSection={<IconTerminal2 size={16} />}>Logs</Tabs.Tab>
                        <Tabs.Tab value="resources" leftSection={<IconBox size={16} />}>Recursos e Inventario</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="logs">
                        <Stack>
                            <Text size="sm" fw={500}>
                                Template: <span style={{ fontWeight: 400 }}>{selectedDeployment?.template?.name}</span>
                            </Text>

                            <Box 
                                p="md" 
                                style={{ 
                                    borderRadius: '16px',
                                    overflow: 'hidden',
                                    position: 'relative',
                                    backgroundImage: colorScheme === 'dark' ? "url('/terraformars/wall1.jpg')" : "url('/terraformars/wall3.jpg')",
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center',
                                    minHeight: '300px'
                                }}
                            >
                                <Box 
                                    style={{ 
                                        position: 'absolute', 
                                        top: 0, left: 0, right: 0, bottom: 0, 
                                        backgroundColor: 'rgba(0,0,0,0.7)',
                                        zIndex: 1
                                    }} 
                                />
                                <ScrollArea.Autosize mah={500} type="always" style={{ position: 'relative', zIndex: 2 }}>
                                    <Code block bg="transparent" c="jhamf.0" style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                                        {selectedDeployment?.logs || t('modals.logs.not_available')}
                                        {selectedDeployment?.status === 'running' && (
                                            <Box mt="xs">
                                                <Loader size="xs" color="jhamf.4" variant="dots" />
                                            </Box>
                                        )}
                                    </Code>
                                </ScrollArea.Autosize>
                            </Box>

                            {selectedDeployment?.status === 'failed' && getSmartAdvice(selectedDeployment?.logs, t) && (
                                <Alert
                                    icon={<IconBulb size={18} />}
                                    title={getSmartAdvice(selectedDeployment?.logs, t)?.title}
                                    color={getSmartAdvice(selectedDeployment?.logs, t)?.color}
                                    style={{ borderRadius: '12px' }}
                                    variant="light"
                                >
                                    {getSmartAdvice(selectedDeployment?.logs, t)?.message}
                                </Alert>
                            )}
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="resources">
                        <Stack>
                            <Group justify="space-between">
                                <Text size="sm" c="dimmed">Recursos detectados en este despliegue.</Text>
                                {scripts.length > 0 && (
                                    <Select 
                                        size="xs"
                                        placeholder="Seleccionar script para ejecutar"
                                        data={scripts.map(s => ({ value: s.id, label: s.name }))}
                                        value={selectedScriptId}
                                        onChange={setSelectedScriptId}
                                        style={{ width: 250 }}
                                    />
                                )}
                            </Group>

                            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                                {selectedDeployment?.resources_inventory?.map((res: any) => (
                                    <Card key={res.id} withBorder radius="md" p="md">
                                        <Group justify="space-between" mb="xs">
                                            <ThemeIcon variant="light" color="jhamf" size="lg">
                                                {res.type.includes('virtual_machine') ? <IconDeviceDesktop size={20} /> : <IconBox size={20} />}
                                            </ThemeIcon>
                                            <Badge size="xs" variant="outline">{res.type.split('_').pop()}</Badge>
                                        </Group>
                                        
                                        <Text fw={600} size="sm" lineClamp={1}>{res.name}</Text>
                                        <Text size="xs" c="dimmed" mb="sm" lineClamp={1}>{maskAzurePath(res.id)}</Text>
                                        
                                        <Divider my="sm" />
                                        
                                        <Stack gap={4}>
                                            {res.public_ip && (
                                                <Group justify="space-between">
                                                    <Text size="xs" fw={500}>IP Pública:</Text>
                                                    <Code color="blue" variant="light">{res.public_ip}</Code>
                                                </Group>
                                            )}
                                            {res.private_ip && (
                                                <Group justify="space-between">
                                                    <Text size="xs" fw={500}>IP Privada:</Text>
                                                    <Code variant="light">{res.private_ip}</Code>
                                                </Group>
                                            )}
                                            <Group justify="space-between">
                                                <Text size="xs" fw={500}>Región:</Text>
                                                <Text size="xs text-uppercase">{res.location}</Text>
                                            </Group>
                                        </Stack>

                                        {res.type.includes('virtual_machine') && (
                                            <Button 
                                                fullWidth 
                                                mt="md" 
                                                size="xs" 
                                                variant="light" 
                                                color="jhamf"
                                                leftSection={<IconPlayerPlay size={14} />}
                                                onClick={() => handleExecuteScript(res.id)}
                                                loading={executingResourceId === res.id}
                                                disabled={!!selectedScriptId && executingResourceId !== null}
                                            >
                                                Ejecutar Script
                                            </Button>
                                        )}
                                    </Card>
                                ))}
                            </SimpleGrid>

                            {(!selectedDeployment?.resources_inventory || selectedDeployment.resources_inventory.length === 0) && (
                                <Center py="xl">
                                    <Stack align="center" gap="xs">
                                        <IconAlertTriangle size={40} color="gray" />
                                        <Text c="dimmed">No sde encontraron recursos registrados.</Text>
                                        <Text size="xs" c="dimmed">Asegúrate de que el despliegue haya terminado con éxito.</Text>
                                    </Stack>
                                </Center>
                            )}
                        </Stack>
                    </Tabs.Panel>
                </Tabs>
            </Modal>
        </DashboardLayout>
    );
}
