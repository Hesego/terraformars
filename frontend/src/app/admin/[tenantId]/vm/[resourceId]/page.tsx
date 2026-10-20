'use client';

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
    Title, Text, Stack, Box, Group, ThemeIcon,
    Tabs, Breadcrumbs, Anchor, ActionIcon, Paper, Badge, SimpleGrid,
} from '@mantine/core';
import {
    IconShieldCog, IconServer, IconArrowLeft, IconChartBar,
    IconTerminal2, IconInfoCircle, IconCpu, IconMapPin, IconTag,
} from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { MetricsDashboard } from '../../../components/MetricsDashboard';
import { ScriptConsole } from '../../../components/ScriptConsole';
import { useEffect, useState } from 'react';
import { DeploymentAppService } from '@/services/api';

export default function VMDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const tenantId = params.tenantId as string;
    const resourceId = decodeURIComponent(params.resourceId as string);
    const resourceName = searchParams.get('name') || resourceId;
    const resourceGroup = searchParams.get('rg') || 'unknown';
    const router = useRouter();
    const { user } = useAuth();
    const { t } = useTranslation();

    // Find the deployment that contains this VM to allow script execution
    const [deploymentId, setDeploymentId] = useState<string | null>(null);

    useEffect(() => {
        if (user) {
            DeploymentAppService.list().then((deps: any[]) => {
                const dep = deps.find(d =>
                    d.tenant_id === tenantId &&
                    d.resources_inventory?.some((r: any) => r.id?.toLowerCase() === resourceId?.toLowerCase())
                );
                if (dep) setDeploymentId(dep.id);
            }).catch(console.error);
        }
    }, [user, tenantId, resourceId]);

    // Parse OS type from resource id (best effort)
    const osType = resourceId.toLowerCase().includes('windows') ? 'Windows' : 'Linux';

    const breadcrumbs = [
        { label: t('menu.admin'), href: '/admin' },
        { label: t('admin.tenant'), href: `/admin/${tenantId}` },
        { label: resourceName, href: '#' },
    ].map((item, i) => (
        <Anchor
            key={i}
            href={item.href}
            onClick={(e) => { e.preventDefault(); if (item.href !== '#') router.push(item.href); }}
            c={item.href === '#' ? 'terra' : 'dimmed'}
        >
            {item.label}
        </Anchor>
    ));

    const resource = {
        id: resourceId,
        name: resourceName,
        resourceGroup,
    };

    return (
        <DashboardLayout>
            <Stack gap="xl">
                <Breadcrumbs>{breadcrumbs}</Breadcrumbs>

                <Box>
                    <Group gap="xs" mb={4}>
                        <ActionIcon variant="subtle" color="terra" onClick={() => router.push(`/admin/${tenantId}`)}>
                            <IconArrowLeft size={18} />
                        </ActionIcon>
                        <ThemeIcon size={38} radius="md" color="terra" variant="light">
                            <IconServer size={22} />
                        </ThemeIcon>
                        <Title order={1} style={{ fontFamily: 'var(--font-outfit)', fontWeight: 800 }}>
                            {resourceName}
                        </Title>
                        <Badge variant="dot" color="terra" size="lg">Virtual Machine</Badge>
                    </Group>
                </Box>

                {/* Resource Info Card */}
                <Paper withBorder radius="md" p="lg">
                    <Title order={4} mb="md">
                        <Group gap="xs">
                            <IconInfoCircle size={18} />
                            {t('admin.resource_info')}
                        </Group>
                    </Title>
                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                        <Group gap="xs">
                            <IconTag size={16} color="var(--mantine-color-dimmed)" />
                            <Box>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Resource Group</Text>
                                <Text size="sm" fw={500}>{resourceGroup}</Text>
                            </Box>
                        </Group>
                        <Group gap="xs">
                            <IconCpu size={16} color="var(--mantine-color-dimmed)" />
                            <Box>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>OS Type</Text>
                                <Text size="sm" fw={500}>{osType}</Text>
                            </Box>
                        </Group>
                        <Group gap="xs">
                            <IconShieldCog size={16} color="var(--mantine-color-dimmed)" />
                            <Box>
                                <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Tenant</Text>
                                <Text size="sm" fw={500}>{tenantId.slice(0, 8)}…</Text>
                            </Box>
                        </Group>
                    </SimpleGrid>
                </Paper>

                {/* Tabs: Metrics + Console */}
                <Tabs defaultValue="metrics" color="terra">
                    <Tabs.List mb="lg">
                        <Tabs.Tab value="metrics" leftSection={<IconChartBar size={16} />}>
                            {t('admin.tabs.metrics')}
                        </Tabs.Tab>
                        <Tabs.Tab value="console" leftSection={<IconTerminal2 size={16} />}>
                            {t('admin.tabs.console')}
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="metrics">
                        <Paper withBorder radius="md" p="lg">
                            <MetricsDashboard
                                resource={resource}
                                tenantId={tenantId}
                                resourceType="vm"
                            />
                        </Paper>
                    </Tabs.Panel>

                    <Tabs.Panel value="console">
                        <Paper withBorder radius="md" p="lg">
                            <ScriptConsole
                                tenantId={tenantId}
                                resourceId={resourceId}
                                resourceName={resourceName}
                                resourceGroup={resourceGroup}
                                osType={osType as 'Linux' | 'Windows'}
                                deploymentId={deploymentId}
                            />
                        </Paper>
                    </Tabs.Panel>
                </Tabs>
            </Stack>
        </DashboardLayout>
    );
}
