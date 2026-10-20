'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
    Title, Text, Stack, SimpleGrid, Box, Group, ThemeIcon,
    Loader, Center, Tabs, Breadcrumbs, Anchor, ActionIcon,
    Alert,
} from '@mantine/core';
import {
    IconShieldCog, IconServer, IconCloud, IconBuildingFactory2,
    IconNetworkOff, IconArrowLeft, IconAlertCircle, IconDatabase,
} from '@tabler/icons-react';
import { TenantAppService, AdminAppService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { ResourceCard } from '../components/ResourceCard';
import { VNetControls } from '../components/VNetControls';

export default function AdminTenantPage() {
    const params = useParams();
    const tenantId = params.tenantId as string;
    const [tenant, setTenant] = useState<any>(null);
    const [resources, setResources] = useState<{ vms: any[]; aks: any[]; appServices: any[]; vnets: any[]; databases: any[] }>({
        vms: [], aks: [], appServices: [], vnets: [], databases: [],
    });
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        if (user && tenantId) loadData();
    }, [user, tenantId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tenantData, resourceData] = await Promise.all([
                TenantAppService.getOne(tenantId),
                AdminAppService.getAllResources(tenantId),
            ]);
            setTenant(tenantData);
            setResources(resourceData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
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

    const breadcrumbs = [
        { label: t('menu.admin'), href: '/admin' },
        { label: tenant?.name || tenantId, href: '#' },
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

    return (
        <DashboardLayout>
            <Stack gap="xl">
                <Breadcrumbs>{breadcrumbs}</Breadcrumbs>

                <Box>
                    <Group gap="xs" mb={4}>
                        <ActionIcon variant="subtle" color="terra" onClick={() => router.push('/admin')}>
                            <IconArrowLeft size={18} />
                        </ActionIcon>
                        <ThemeIcon size={38} radius="md" color="terra" variant="light">
                            <IconShieldCog size={22} />
                        </ThemeIcon>
                        <Title order={1} style={{ fontFamily: 'var(--font-outfit)', fontWeight: 800 }}>
                            {tenant?.name}
                        </Title>
                    </Group>
                    <Text c="dimmed" ml={46}>{t('admin.tenant_subtitle')}</Text>
                </Box>

                <Tabs defaultValue="vms" color="terra">
                    <Tabs.List mb="lg">
                        <Tabs.Tab value="vms" leftSection={<IconServer size={16} />}>
                            {t('admin.tabs.vms')} ({resources.vms.length})
                        </Tabs.Tab>
                        <Tabs.Tab value="aks" leftSection={<IconCloud size={16} />}>
                            {t('admin.tabs.aks')} ({resources.aks.length})
                        </Tabs.Tab>
                        <Tabs.Tab value="appservices" leftSection={<IconBuildingFactory2 size={16} />}>
                            {t('admin.tabs.appservices')} ({resources.appServices.length})
                        </Tabs.Tab>
                        <Tabs.Tab value="databases" leftSection={<IconDatabase size={16} />}>
                            {t('admin.tabs.databases')} ({resources.databases.length})
                        </Tabs.Tab>
                        <Tabs.Tab value="vnets" leftSection={<IconNetworkOff size={16} />}>
                            {t('admin.tabs.vnets')} ({resources.vnets.length})
                        </Tabs.Tab>
                    </Tabs.List>

                    {/* VMs */}
                    <Tabs.Panel value="vms">
                        {resources.vms.length === 0 ? (
                            <Alert icon={<IconAlertCircle size={16} />} color="gray" variant="light" radius="md">
                                {t('admin.no_resources_type')}
                            </Alert>
                        ) : (
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                                {resources.vms.map((vm) => (
                                    <ResourceCard
                                        key={vm.id}
                                        resource={vm}
                                        resourceType="vm"
                                        onClick={() => router.push(`/admin/${tenantId}/vm/${encodeURIComponent(vm.id)}?name=${encodeURIComponent(vm.name)}&rg=${encodeURIComponent(vm.resourceGroup)}`)}
                                    />
                                ))}
                            </SimpleGrid>
                        )}
                    </Tabs.Panel>

                    {/* AKS */}
                    <Tabs.Panel value="aks">
                        {resources.aks.length === 0 ? (
                            <Alert icon={<IconAlertCircle size={16} />} color="gray" variant="light" radius="md">
                                {t('admin.no_resources_type')}
                            </Alert>
                        ) : (
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                                {resources.aks.map((cluster) => (
                                    <ResourceCard
                                        key={cluster.id}
                                        resource={cluster}
                                        resourceType="aks"
                                        onClick={() => router.push(`/admin/${tenantId}/aks/${encodeURIComponent(cluster.id)}?name=${encodeURIComponent(cluster.name)}&rg=${encodeURIComponent(cluster.resourceGroup)}`)}
                                    />
                                ))}
                            </SimpleGrid>
                        )}
                    </Tabs.Panel>

                    {/* App Services */}
                    <Tabs.Panel value="appservices">
                        {resources.appServices.length === 0 ? (
                            <Alert icon={<IconAlertCircle size={16} />} color="gray" variant="light" radius="md">
                                {t('admin.no_resources_type')}
                            </Alert>
                        ) : (
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                                {resources.appServices.map((app) => (
                                    <ResourceCard
                                        key={app.id}
                                        resource={app}
                                        resourceType="appService"
                                        onClick={() => router.push(`/admin/${tenantId}/appservice/${encodeURIComponent(app.id)}?name=${encodeURIComponent(app.name)}&rg=${encodeURIComponent(app.resourceGroup)}`)}
                                    />
                                ))}
                            </SimpleGrid>
                        )}
                    </Tabs.Panel>

                    {/* Databases */}
                    <Tabs.Panel value="databases">
                        {resources.databases.length === 0 ? (
                            <Alert icon={<IconAlertCircle size={16} />} color="gray" variant="light" radius="md">
                                {t('admin.no_resources_type')}
                            </Alert>
                        ) : (
                            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                                {resources.databases.map((db) => (
                                    <ResourceCard
                                        key={db.id}
                                        resource={db}
                                        resourceType="db"
                                        onClick={() => router.push(`/resources/${tenantId}/${db.deploymentId || 'external'}?name=${encodeURIComponent(db.name)}`)}
                                    />
                                ))}
                            </SimpleGrid>
                        )}
                    </Tabs.Panel>

                    {/* VNets */}
                    <Tabs.Panel value="vnets">
                        <VNetControls
                            vnets={resources.vnets}
                            tenantId={tenantId}
                            onRefresh={loadData}
                        />
                    </Tabs.Panel>
                </Tabs>
            </Stack>
        </DashboardLayout>
    );
}
