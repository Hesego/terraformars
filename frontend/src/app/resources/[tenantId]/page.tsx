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
} from '@mantine/core';
import { IconChevronRight, IconCloudComputing, IconRocket, IconArrowLeft, IconTrash, IconActivity } from '@tabler/icons-react';
import { DeploymentAppService, TenantAppService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';
import { maskId } from '@/utils/masking';

export default function TenantResourcesPage() {
    const params = useParams();
    const tenantId = params.tenantId as string;
    const [tenant, setTenant] = useState<any>(null);
    const [deployments, setDeployments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { user, isLoading: authLoading } = useAuth();
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        if (user && tenantId) {
            loadData();
        }
    }, [user, tenantId]);

    const loadData = async () => {
        try {
            const [tenantData, deploymentsList] = await Promise.all([
                TenantAppService.getOne(tenantId),
                DeploymentAppService.list()
            ]);
            
            setTenant(tenantData);
            setDeployments(deploymentsList.filter((d: any) => d.tenant_id === tenantId));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteDeployment = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        modals.openConfirmModal({
            title: t('common.confirm_action'),
            centered: true,
            children: (
                <Text size="sm">
                    {t('resources.deployments_page.delete_deployment_msg')}
                </Text>
            ),
            labels: { confirm: t('common.delete'), cancel: t('common.cancel') },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                try {
                    await DeploymentAppService.delete(id);
                    notifications.show({ title: t('common.success'), message: t('resources.deployments_page.deployment_deleted'), color: 'green' });
                    loadData();
                } catch (error) {
                    notifications.show({ title: t('common.error'), message: t('resources.deployments_page.delete_error'), color: 'red' });
                }
            }
        });
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
        { title: tenant?.name || 'Tenant', href: '#' },
    ].map((item, index) => (
        <Anchor href={item.href} key={index} onClick={(e) => { e.preventDefault(); if (item.href !== '#') router.push(item.href); }} c={item.href === '#' ? 'terra' : 'dimmed'}>
            {item.title}
        </Anchor>
    ));

    return (
        <DashboardLayout>
            <Stack gap="xl">
                <Breadcrumbs>{items}</Breadcrumbs>

                <Box>
                    <Group gap="xs" mb="xs">
                        <ActionIcon variant="subtle" color="terra" onClick={() => router.push('/resources')}>
                            <IconArrowLeft size={18} />
                        </ActionIcon>
                        <Title order={1} style={{ fontFamily: 'var(--font-outfit)', fontWeight: 800 }}>
                            {t('resources.deployments_page.title', { name: tenant?.name })}
                        </Title>
                    </Group>
                    <Text c="dimmed">{t('resources.deployments_page.subtitle')}</Text>
                </Box>

                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                    {deployments.map((deployment) => (
                        <Card 
                            key={deployment.id} 
                            withBorder 
                            radius="md" 
                            p="xl"
                            className="hover-card"
                            onClick={() => router.push(`/resources/${tenantId}/${deployment.id}`)}
                            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                        >
                            <Group justify="space-between" mb="sm">
                                <ThemeIcon size={40} radius="md" color="terra" variant="light">
                                    <IconRocket size={24} />
                                </ThemeIcon>
                                <Group gap="xs">
                                    <Badge color={deployment.status === 'success' ? 'green' : 'red'} variant="light">
                                        {deployment.status}
                                    </Badge>
                                    <Badge color="blue" variant="outline" leftSection={<IconActivity size={10} />}>
                                        Live
                                    </Badge>
                                    <ActionIcon 
                                        variant="subtle" 
                                        color="red" 
                                        onClick={(e) => handleDeleteDeployment(deployment.id, e)}
                                        className="delete-button"
                                    >
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Group>
                            </Group>

                            <Text fw={700} size="lg">{deployment.template?.name || 'Sin nombre'}</Text>
                            <Text size="xs" c="dimmed" mb="md">ID: {maskId(deployment.id)}</Text>

                            <Group justify="space-between" mt="md">
                                <Stack gap={0}>
                                    <Text size="xs" fw={700} c="dimmed" tt="uppercase">{t('resources.deployments_page.detected')}</Text>
                                    <Text fw={800} size="xl" c="terra">{deployment.resources_inventory?.length || 0}</Text>
                                </Stack>
                                <ActionIcon variant="light" color="terra" radius="xl" size="lg">
                                    <IconChevronRight size={18} />
                                </ActionIcon>
                            </Group>
                        </Card>
                    ))}
                </SimpleGrid>
            </Stack>

            <style jsx global>{`
                .hover-card:hover {
                    transform: translateY(-5px);
                    box-shadow: var(--mantine-shadow-md);
                    border-color: var(--mantine-color-terra-light) !important;
                }
                .delete-button {
                    opacity: 0;
                    transition: opacity 0.2s ease;
                }
                .hover-card:hover .delete-button {
                    opacity: 1;
                }
            `}</style>
        </DashboardLayout>
    );
}
