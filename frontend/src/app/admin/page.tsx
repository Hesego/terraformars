'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
    Title, Text, Stack, SimpleGrid, Card, Group, ThemeIcon, Badge,
    Loader, Center, Box, ActionIcon,
} from '@mantine/core';
import {
    IconShieldCog, IconServer, IconCloud, IconBuildingFactory2,
    IconNetworkOff, IconChevronRight,
} from '@tabler/icons-react';
import { TenantAppService, AdminAppService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

export default function AdminPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [resourceCounts, setResourceCounts] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        if (user) loadData();
        else if (!authLoading) setLoading(false);
    }, [user, authLoading]);

    const loadData = async () => {
        try {
            const tenantList = await TenantAppService.list();
            setTenants(tenantList);

            // Fetch resource counts for each tenant in parallel
            const counts = await Promise.all(
                tenantList.map(async (t: any) => {
                    try {
                        const resources = await AdminAppService.getAllResources(t.id);
                        return { id: t.id, ...resources };
                    } catch {
                        return { id: t.id, vms: [], aks: [], appServices: [], vnets: [] };
                    }
                })
            );
            const countsMap: Record<string, any> = {};
            counts.forEach(c => { countsMap[c.id] = c; });
            setResourceCounts(countsMap);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <DashboardLayout>
                <Center h="60vh">
                    <Loader size="xl" color="jhamf" variant="bars" />
                </Center>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <Stack gap="xl">
                <Box>
                    <Group gap="xs" mb={4}>
                        <ThemeIcon size={38} radius="md" color="jhamf" variant="light">
                            <IconShieldCog size={22} />
                        </ThemeIcon>
                        <Title order={1} style={{ fontFamily: 'var(--font-outfit)', fontWeight: 800 }}>
                            {t('menu.admin')}
                        </Title>
                    </Group>
                    <Text c="dimmed">{t('admin.subtitle')}</Text>
                </Box>

                {tenants.length === 0 ? (
                    <Center py={80}>
                        <Stack align="center" gap="xs">
                            <IconShieldCog size={48} color="var(--mantine-color-terra-light-color)" />
                            <Title order={3}>{t('admin.no_tenants')}</Title>
                            <Text c="dimmed">{t('admin.no_tenants_desc')}</Text>
                        </Stack>
                    </Center>
                ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                        {tenants.map((tenant) => {
                            const counts = resourceCounts[tenant.id];
                            const vmsCount = counts?.vms?.length ?? '...';
                            const aksCount = counts?.aks?.length ?? '...';
                            const appCount = counts?.appServices?.length ?? '...';
                            const vnetCount = counts?.vnets?.length ?? '...';

                            return (
                                <Card
                                    key={tenant.id}
                                    withBorder
                                    radius="md"
                                    p="xl"
                                    className="hover-card"
                                    onClick={() => router.push(`/admin/${tenant.id}`)}
                                    style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                                >
                                    <Group justify="space-between" mb="md">
                                        <ThemeIcon size={44} radius="md" color="jhamf" variant="light">
                                            <IconShieldCog size={26} />
                                        </ThemeIcon>
                                        <ActionIcon variant="light" color="jhamf" radius="xl" size="lg">
                                            <IconChevronRight size={18} />
                                        </ActionIcon>
                                    </Group>

                                    <Text fw={700} size="lg" mb={4}>{tenant.name}</Text>
                                    <Text size="xs" c="dimmed" mb="md">{tenant.tenant_id?.slice(0, 8)}…</Text>

                                    <SimpleGrid cols={2} spacing="xs">
                                        <Group gap={6}>
                                            <IconServer size={14} color="var(--mantine-color-terra-filled)" />
                                            <Text size="xs">{vmsCount} VMs</Text>
                                        </Group>
                                        <Group gap={6}>
                                            <IconCloud size={14} color="#339af0" />
                                            <Text size="xs">{aksCount} AKS</Text>
                                        </Group>
                                        <Group gap={6}>
                                            <IconBuildingFactory2 size={14} color="#ae3ec9" />
                                            <Text size="xs">{appCount} App Services</Text>
                                        </Group>
                                        <Group gap={6}>
                                            <IconNetworkOff size={14} color="#0ca678" />
                                            <Text size="xs">{vnetCount} VNets</Text>
                                        </Group>
                                    </SimpleGrid>
                                </Card>
                            );
                        })}
                    </SimpleGrid>
                )}
            </Stack>

            <style jsx global>{`
                .hover-card:hover {
                    transform: translateY(-4px);
                    box-shadow: var(--mantine-shadow-md);
                    border-color: var(--mantine-color-terra-light) !important;
                    background-color: var(--mantine-color-default-hover);
                }
            `}</style>
        </DashboardLayout>
    );
}
