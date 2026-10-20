'use client';

import { useEffect, useState } from 'react';
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
    Box,
} from '@mantine/core';
import { IconChevronRight, IconCloudComputing, IconServer, IconAlertTriangle } from '@tabler/icons-react';
import { DeploymentAppService, TenantAppService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { maskId } from '@/utils/masking';

export default function ResourcesPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [deployments, setDeployments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        if (user) {
            loadData();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading]);

    const loadData = async () => {
        try {
            const [tenantsList, deploymentsList] = await Promise.all([
                TenantAppService.list(),
                DeploymentAppService.list()
            ]);
            
            // Filter tenants that have deployments
            const tenantsWithDeployments = tenantsList.filter((t: any) => 
                deploymentsList.some((d: any) => d.tenant_id === t.id)
            );
            
            setTenants(tenantsWithDeployments);
            setDeployments(deploymentsList);
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
                    <Title order={1} style={{ fontFamily: 'var(--font-outfit)', fontWeight: 800 }}>
                        {t('menu.resources')}
                    </Title>
                    <Text c="dimmed">{t('resources.subtitle')}</Text>
                </Box>

                {tenants.length > 0 ? (
                    <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
                        {tenants.map((tenant) => {
                            const tenantDeployments = deployments.filter(d => d.tenant_id === tenant.id);
                            const totalResources = tenantDeployments.reduce((acc, d) => acc + (d.resources_inventory?.length || 0), 0);

                            return (
                                <Card 
                                    key={tenant.id} 
                                    withBorder 
                                    radius="md" 
                                    p="xl"
                                    className="hover-card"
                                    onClick={() => router.push(`/resources/${tenant.id}`)}
                                    style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                                >
                                    <Group justify="space-between" mb="md">
                                        <ThemeIcon size={44} radius="md" color="jhamf" variant="light">
                                            <IconCloudComputing size={26} />
                                        </ThemeIcon>
                                        <Box>
                                            <Badge variant="dot" color="jhamf">{tenantDeployments.length} {t('menu.deployments')}</Badge>
                                        </Box>
                                    </Group>

                                    <Text fw={700} size="lg" mb={4}>{tenant.name}</Text>
                                    <Text size="xs" c="dimmed" mb="md">ID: {maskId(tenant.tenant_id)}</Text>

                                    <Group justify="space-between" mt="md">
                                        <Stack gap={0}>
                                            <Text size="xs" fw={700} c="dimmed" tt="uppercase">{t('resources.total_resources')}</Text>
                                            <Text fw={800} size="xl" c="terra">{totalResources}</Text>
                                        </Stack>
                                        <ActionIcon variant="light" color="jhamf" radius="xl" size="lg">
                                            <IconChevronRight size={18} />
                                        </ActionIcon>
                                    </Group>
                                </Card>
                            );
                        })}
                    </SimpleGrid>
                ) : (
                    <Center py={100}>
                        <Stack align="center" gap="xs">
                            <IconAlertTriangle size={48} color="orange" />
                            <Title order={3}>{t('resources.no_resources')}</Title>
                            <Text c="dimmed">{t('resources.no_resources_desc')}</Text>
                        </Stack>
                    </Center>
                )}
            </Stack>

            <style jsx global>{`
                .hover-card:hover {
                    transform: translateY(-5px);
                    box-shadow: var(--mantine-shadow-md);
                    border-color: var(--mantine-color-terra-light) !important;
                    background-color: var(--mantine-color-default-hover);
                }
            `}</style>
        </DashboardLayout>
    );
}
