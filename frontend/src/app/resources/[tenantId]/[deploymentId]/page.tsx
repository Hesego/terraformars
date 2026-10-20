'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
    Title,
    Text,
    Stack,
    Card,
    Group,
    Loader,
    Center,
    SimpleGrid,
    ThemeIcon,
    Badge,
    ActionIcon,
    Breadcrumbs,
    Anchor,
    Box,
    Select,
    Divider,
    Button,
    Code,
    Alert,
    Tabs,
    Progress,
} from '@mantine/core';
import { Sparkline, AreaChart } from '@mantine/charts';
import { 
    IconChevronRight, 
    IconCloudComputing, 
    IconRocket, 
    IconArrowLeft, 
    IconBox, 
    IconDeviceDesktop, 
    IconPlayerPlay,
    IconCircleCheck,
    IconAlertTriangle,
    IconServer,
    IconNetwork,
    IconSettings,
    IconTerminal2
} from '@tabler/icons-react';
import { ScriptLogsModal } from '@/components/ScriptLogsModal';

import { DeploymentAppService, TenantAppService, ScriptAppService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { notifications } from '@mantine/notifications';
import { DatabaseConsoleModal } from '@/components/DatabaseConsoleModal';
import { useTranslation } from 'react-i18next';
import { useMonitoring } from '@/hooks/useMonitoring';
import { maskAzurePath } from '@/utils/masking';

// Help helper for categorization
const getResourceCategory = (type: string) => {
    const t = type.toLowerCase().replace(/_/g, '');
    if (t.includes('virtualmachine') || t.includes('appservice') || t.includes('functionapp') || t.includes('server')) return 'compute';
    if (t.includes('network') || t.includes('nic') || t.includes('ip') || t.includes('nsg') || t.includes('subnet') || t.includes('interface')) return 'networking';
    return 'other';
};

export default function DeploymentResourcesViewPage() {
    const params = useParams();
    const tenantId = params.tenantId as string;
    const deploymentId = params.deploymentId as string;
    
    const [tenant, setTenant] = useState<any>(null);
    const [deployment, setDeployment] = useState<any>(null);
    const [scripts, setScripts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [executingResourceId, setExecutingResourceId] = useState<string | null>(null);
    const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null);
    const [logsModalOpened, setLogsModalOpened] = useState(false);
    const [consoleModalOpened, setConsoleModalOpened] = useState(false);
    const [consoleResource, setConsoleResource] = useState<any>(null);
    const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);

    const { user } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();
    const { statuses, subscribeToResource, unsubscribeFromResource } = useMonitoring();

    useEffect(() => {
        if (user && tenantId && deploymentId) {
            loadData();
        }
    }, [user, tenantId, deploymentId]);

    // Subscribe to resources for real-time monitoring
    useEffect(() => {
        if (deployment?.resources_inventory) {
            deployment.resources_inventory.forEach((res: any) => {
                const rgMatch = res.id.match(/resourceGroups\/([^/]+)/i);
                const rgName = rgMatch ? rgMatch[1] : '';
                
                const normalizedType = res.type.toLowerCase().replace(/_/g, '');
                const isVM = normalizedType.includes('virtualmachine');
                const isNIC = normalizedType.includes('networkinterface');

                subscribeToResource({
                    tenantId,
                    resourceId: res.id,
                    resourceType: isVM ? 'Microsoft.Compute/virtualMachines' : (isNIC ? 'Microsoft.Network/networkInterfaces' : res.type),
                    resourceName: res.name,
                    resourceGroupName: rgName
                });
            });

            return () => {
                deployment.resources_inventory.forEach((res: any) => {
                    unsubscribeFromResource(res.id);
                });
            };
        }
    }, [deployment?.resources_inventory, tenantId, subscribeToResource, unsubscribeFromResource]);

    const loadData = async () => {
        try {
            const [tenantData, deploymentData, scriptsList] = await Promise.all([
                TenantAppService.getOne(tenantId),
                DeploymentAppService.list().then((list: any[]) => list.find((d: any) => d.id === deploymentId)),
                ScriptAppService.list()
            ]);
            
            setTenant(tenantData);
            setDeployment(deploymentData);
            setScripts(scriptsList);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleExecuteScript = async (resourceId: string) => {
        if (!selectedScriptId) {
            notifications.show({ title: t('common.error'), message: t('resources.monitoring.scripts.error_select'), color: 'red' });
            return;
        }

        setExecutingResourceId(resourceId);
        try {
            const result = await DeploymentAppService.executeScript(deploymentId, resourceId, selectedScriptId);
            
            // Result is now the ScriptExecution entity from backend
            setCurrentExecutionId(result.id);
            setLogsModalOpened(true);
            
        } catch (error: any) {
            const msg = error.response?.data?.message || t('resources.monitoring.scripts.execute_error');
            notifications.show({ title: t('common.error'), message: msg, color: 'red' });
        } finally {
            setExecutingResourceId(null);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <Center h="60vh">
                    <Loader size="xl" color="terra" variant="bars" />
                </Center>
            </DashboardLayout>
        );
    }

    const items = [
        { title: t('menu.resources'), href: '/resources' },
        { title: tenant?.name || 'Tenant', href: `/resources/${tenantId}` },
        { title: deployment?.template?.name || t('resources.monitoring.title'), href: '#' },
    ].map((item, index) => (
        <Anchor 
            href={item.href} 
            key={index} 
            onClick={(e) => { 
                e.preventDefault(); 
                if (item.href !== '#') router.push(item.href); 
            }} 
            c={item.href === '#' ? 'terra' : 'dimmed'}
            size="sm"
        >
            {item.title}
        </Anchor>
    ));

    const categorized = {
        compute: deployment?.resources_inventory?.filter((r: any) => getResourceCategory(r.type) === 'compute') || [],
        networking: deployment?.resources_inventory?.filter((r: any) => getResourceCategory(r.type) === 'networking') || [],
        other: deployment?.resources_inventory?.filter((r: any) => getResourceCategory(r.type) === 'other') || []
    };

    const renderResourceCard = (res: any) => {
        const stats = statuses[res.id];
        const normalizedType = res.type.toLowerCase().replace(/_/g, '');
        const isVM = normalizedType.includes('virtualmachine');

        // Color logic for keys
        const getBadgeColor = (statusKey: string | undefined) => {
            if (!statusKey) return 'gray';
            // Status keys now come prefixed from backend (e.g. resources.monitoring.status.running)
            if (statusKey.includes('running') || statusKey.includes('active')) return 'green';
            if (statusKey.includes('starting') || statusKey.includes('updating') || statusKey.includes('creating')) return 'blue';
            if (statusKey.includes('stopped') || statusKey.includes('failed')) return 'red';
            return 'orange';
        };

        return (
            <Card key={res.id} withBorder radius="md" p="md" shadow="sm">
                <Group justify="space-between" mb="xs">
                    <ThemeIcon variant="light" color="terra" size="lg">
                        {isVM ? <IconDeviceDesktop size={20} /> : <IconBox size={20} />}
                    </ThemeIcon>
                    <Group gap={5}>
                        <Badge 
                            size="xs" 
                            variant="filled" 
                            leftSection={stats?.status ? <Box className="pulse-dot" /> : null}
                            color={getBadgeColor(stats?.status)}
                        >
                            {stats?.status ? t(stats.status) : t('resources.monitoring.status.syncing')}
                        </Badge>
                        <Badge size="xs" variant="outline">{res.type.split('_').pop() || 'Resource'}</Badge>
                    </Group>
                </Group>

                {isVM && (
                    <Box mt="md" mb="md" style={{ minHeight: stats?.metrics ? 'auto' : '100px' }}>
                        {!stats?.metrics ? (
                            <Center h={100}>
                                <Stack align="center" gap={4}>
                                    <Loader size="xs" color="terra" />
                                    <Text size="10px" c="dimmed">{t('resources.monitoring.status.syncing')}</Text>
                                </Stack>
                            </Center>
                        ) : (
                            <>
                                {/* CPU */}
                                <Box mb="md">
                                    <Group justify="space-between" mb={4}>
                                        <Text size="10px" fw={700} c="dimmed">{t('resources.monitoring.metrics.cpu')}</Text>
                                        <Text size="10px" fw={700} color={(stats.metrics.slice(-1)[0]?.cpu || 0) > 80 ? 'red' : 'green'}>
                                            {Math.round(stats.metrics.slice(-1)[0]?.cpu || 0)}%
                                        </Text>
                                    </Group>
                                    <Sparkline
                                        w="100%"
                                        h={30}
                                        data={stats.metrics.map((m: any) => m.cpu) || []}
                                        curveType="linear"
                                        color="terra"
                                        fillOpacity={0.2}
                                    />
                                </Box>

                                {/* Network */}
                                <Box mb="md">
                                    <Text size="10px" fw={700} c="dimmed" mb={4}>{t('resources.monitoring.metrics.network')}</Text>
                                    <AreaChart
                                        h={50}
                                        data={stats.metrics.map((m: any) => ({
                                            time: m.time,
                                            'In': m.netIn / 1024,
                                            'Out': m.netOut / 1024
                                        }))}
                                        dataKey="time"
                                        series={[
                                            { name: 'In', color: 'blue.6' },
                                            { name: 'Out', color: 'teal.6' },
                                        ]}
                                        withXAxis={false}
                                        withYAxis={false}
                                        withDots={false}
                                        curveType="monotone"
                                        fillOpacity={0.2}
                                    />
                                </Box>

                                {/* Disk */}
                                <Box mb="md">
                                    <Group justify="space-between" mb={4}>
                                        <Text size="10px" fw={700} c="dimmed">{t('resources.monitoring.metrics.disk')}</Text>
                                        <Text size="10px" fw={700} c="dimmed">MB/s</Text>
                                    </Group>
                                     <Sparkline
                                        w="100%"
                                        h={20}
                                        data={stats.metrics.map((m: any) => (m.diskRead + m.diskWrite) / (1024 * 1024)) || []}
                                        curveType="linear"
                                        color="orange"
                                        fillOpacity={0.1}
                                    />
                                </Box>

                                {/* Memory */}
                                {stats.metrics.slice(-1)[0]?.memoryAvailable !== null && stats.metrics.slice(-1)[0]?.memoryAvailable !== undefined && (
                                    <Box mb="xs">
                                        <Group justify="space-between" mb={4}>
                                            <Text size="10px" fw={700} c="dimmed">{t('resources.monitoring.metrics.memory')}</Text>
                                            <Text size="10px" fw={700} color="blue">
                                                {stats.totalMemory 
                                                    ? `${Math.round(((stats.totalMemory - stats.metrics.slice(-1)[0].memoryAvailable) / stats.totalMemory) * 100)}%` 
                                                    : t('resources.monitoring.status.available')
                                                }
                                            </Text>
                                        </Group>
                                        <Progress 
                                            value={stats.totalMemory ? ((stats.totalMemory - stats.metrics.slice(-1)[0].memoryAvailable) / stats.totalMemory) * 100 : 100} 
                                            size="xs" 
                                            color="blue" 
                                            striped 
                                            animated 
                                            style={{ opacity: 0.6 }}
                                        />
                                        <Group justify="space-between" mt={2}>
                                            <Text size="8px" c="dimmed">
                                                {stats.vmSize || ''}
                                            </Text>
                                            <Text size="8px" c="dimmed">
                                                {(stats.metrics.slice(-1)[0]?.memoryAvailable / (1024 * 1024 * 1024)).toFixed(2)} GB {t('resources.monitoring.status.available')}
                                            </Text>
                                        </Group>
                                    </Box>
                                )}
                            </>
                        )}
                    </Box>
                )}

                <Stack gap={2}>
                    <Text fw={600} size="sm" lineClamp={1}>{res.name}</Text>
                    <Text size="xs" c="dimmed" mb="sm" lineClamp={1}>{maskAzurePath(res.id)}</Text>
                </Stack>
                
                <Divider my="sm" />
                
                <Stack gap={4}>
                    {res.public_ip && (
                        <Group justify="space-between">
                            <Text size="xs" fw={500}>{t('tenants.public_ip')}:</Text>
                            <Code color="blue" variant="light" style={{ fontSize: '10px' }}>{res.public_ip}</Code>
                        </Group>
                    )}
                    {res.private_ip && (
                        <Group justify="space-between">
                            <Text size="xs" fw={500}>{t('tenants.private_ip')}:</Text>
                            <Code variant="light" style={{ fontSize: '10px' }}>{res.private_ip}</Code>
                        </Group>
                    )}
                    <Group justify="space-between">
                        <Text size="xs" fw={500}>{t('common.region')}:</Text>
                        <Text size="xs" style={{ textTransform: 'uppercase' }}>{res.location}</Text>
                    </Group>
                </Stack>

                {isVM && (
                    <Button 
                        fullWidth 
                        mt="md" 
                        size="xs" 
                        variant="light" 
                        color="terra"
                        leftSection={<IconPlayerPlay size={14} />}
                        onClick={() => handleExecuteScript(res.id)}
                        loading={executingResourceId === res.id}
                        disabled={!!selectedScriptId && executingResourceId !== null && executingResourceId !== res.id}
                    >
                        {t('resources.monitoring.scripts.execute')}
                    </Button>
                )}

                {(normalizedType.includes('postgresql') || normalizedType.includes('database')) && (
                    <Button 
                        fullWidth 
                        mt="md" 
                        size="xs" 
                        variant="light" 
                        color="jhamf"
                        leftSection={<IconTerminal2 size={14} />}
                        onClick={() => {
                            setConsoleResource(res);
                            setConsoleModalOpened(true);
                        }}
                    >
                        Consola SQL
                    </Button>
                )}
            </Card>
        );
    };

    return (
        <DashboardLayout>
            <Stack gap="xl">
                <Breadcrumbs>{items}</Breadcrumbs>

                <Group justify="space-between" align="flex-end">
                    <Box>
                        <Group gap="xs" mb="xs">
                            <ActionIcon variant="subtle" color="terra" onClick={() => router.push(`/resources/${tenantId}`)}>
                                <IconArrowLeft size={18} />
                            </ActionIcon>
                            <Title order={1} style={{ fontFamily: 'var(--font-outfit)', fontWeight: 800 }}>
                                {t('resources.monitoring.title')}
                            </Title>
                        </Group>
                        <Text c="dimmed">{t('resources.monitoring.subtitle')}</Text>
                    </Box>

                    {scripts.length > 0 && (
                        <Select 
                            size="sm"
                            label={t('resources.monitoring.scripts.label')}
                            placeholder={t('resources.monitoring.scripts.placeholder')}
                            data={scripts.map(s => ({ value: s.id, label: s.name }))}
                            value={selectedScriptId}
                            onChange={setSelectedScriptId}
                            style={{ width: 300 }}
                        />
                    )}
                </Group>

                <Tabs color="terra" defaultValue="compute" variant="pills">
                    <Tabs.List mb="md">
                        <Tabs.Tab value="compute" leftSection={<IconServer size={14} />}>
                            {t('resources.monitoring.tabs.compute')} ({categorized.compute.length})
                        </Tabs.Tab>
                        <Tabs.Tab value="networking" leftSection={<IconNetwork size={14} />}>
                            {t('resources.monitoring.tabs.networking')} ({categorized.networking.length})
                        </Tabs.Tab>
                        <Tabs.Tab value="other" leftSection={<IconSettings size={14} />}>
                            {t('resources.monitoring.tabs.other')} ({categorized.other.length})
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="compute">
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                            {categorized.compute.map(renderResourceCard)}
                        </SimpleGrid>
                        {categorized.compute.length === 0 && <Text c="dimmed" ta="center" py="xl">{t('resources.monitoring.status.no_resources_type')}</Text>}
                    </Tabs.Panel>

                    <Tabs.Panel value="networking">
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                            {categorized.networking.map(renderResourceCard)}
                        </SimpleGrid>
                        {categorized.networking.length === 0 && <Text c="dimmed" ta="center" py="xl">{t('resources.monitoring.status.no_resources_type')}</Text>}
                    </Tabs.Panel>

                    <Tabs.Panel value="other">
                        <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                            {categorized.other.map(renderResourceCard)}
                        </SimpleGrid>
                        {categorized.other.length === 0 && <Text c="dimmed" ta="center" py="xl">{t('resources.monitoring.status.no_resources_type')}</Text>}
                    </Tabs.Panel>
                </Tabs>

                {(!deployment?.resources_inventory || deployment.resources_inventory.length === 0) && (
                    <Center py={100}>
                        <Stack align="center" gap="xs">
                            <IconAlertTriangle size={48} color="orange" />
                            <Title order={3}>{t('resources.monitoring.status.no_inventory')}</Title>
                            <Text c="dimmed">{t('resources.monitoring.status.no_inventory_desc')}</Text>
                        </Stack>
                    </Center>
                )}
            </Stack>

            <ScriptLogsModal 
                opened={logsModalOpened} 
                onClose={() => setLogsModalOpened(false)} 
                executionId={currentExecutionId} 
            />

            {consoleResource && (
                <DatabaseConsoleModal 
                    opened={consoleModalOpened}
                    onClose={() => setConsoleModalOpened(false)}
                    deploymentId={deploymentId}
                    resourceName={consoleResource.name}
                />
            )}
        </DashboardLayout>
    );
}

