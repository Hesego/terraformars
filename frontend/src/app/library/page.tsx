'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
    Title,
    Text,
    Stack,
    SimpleGrid,
    Card,
    Badge,
    Group,
    Button,
    ActionIcon,
    Tooltip,
    Loader,
    Center,
    Tabs,
    Box,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconRocket, IconCode, IconTrash, IconEye } from '@tabler/icons-react';
import { TemplateAppService, TenantAppService } from '@/services/api';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { DeployModal } from '@/components/DeployModal';
import { TemplateDetailsModal } from '@/components/TemplateDetailsModal';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';

export default function LibraryPage() {
    const [templates, setTemplates] = useState<any[]>([]);
    const [tenants, setTenants] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string | null>('All');
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [prefilledParams, setPrefilledParams] = useState<Record<string, string>>({});
    const [deployOpened, { open: openDeploy, close: closeDeploy }] = useDisclosure(false);
    const [detailsOpened, { open: openDetails, close: closeDetails }] = useDisclosure(false);
    const { user, isLoading: authLoading } = useAuth();
    const { t } = useTranslation();

    const categories = [
        'All',
        'Compute',
        'Networking',
        'Storage',
        'Databases',
        'Containers',
        'Security',
        'AI + Machine Learning',
        'Management + Governance',
        'Others'
    ];

    const filteredTemplates = activeCategory === 'All'
        ? templates
        : templates.filter(t => t.category === activeCategory);

    useEffect(() => {
        if (user) {
            fetchData();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading]);

    const fetchData = async () => {
        try {
            const [tData, tenData] = await Promise.all([
                TemplateAppService.list(),
                TenantAppService.list(),
            ]);
            setTemplates(tData);
            setTenants(tenData);

            if (selectedTemplate) {
                const refreshed = tData.find((t: any) => t.id === selectedTemplate.id);
                if (refreshed) setSelectedTemplate(refreshed);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateTemplate = (updated: any) => {
        setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
        setSelectedTemplate(updated);
    };

    const handleOpenDeploy = (template: any, params?: Record<string, string>) => {
        setSelectedTemplate(template);
        setPrefilledParams(params || {});
        openDeploy();
        closeDetails();
    };

    const handleOpenDetails = (template: any) => {
        setSelectedTemplate(template);
        openDetails();
    };

    const handleDelete = (id: string) => {
        modals.openConfirmModal({
            title: t('common.confirm_action'),
            centered: true,
            children: <Text size="sm">Are you sure you want to delete this template?</Text>,
            labels: { confirm: t('common.delete'), cancel: t('common.cancel') },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                try {
                    await TemplateAppService.delete(id);
                    notifications.show({ title: t('common.success'), message: 'Template deleted', color: 'green' });
                    fetchData();
                } catch (error) {
                    notifications.show({ title: t('common.error'), message: 'Failed to delete template', color: 'red' });
                }
            }
        });
    };

    if (authLoading || (loading && templates.length === 0)) return (
        <DashboardLayout>
            <Center h="70vh"><Loader color="hesego.6" size="xl" /></Center>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <Stack gap="xl">
                <Group justify="space-between" align="flex-end" wrap="wrap" gap="lg">
                    <Stack gap={0}>
                        <Title order={1}>{t('library.title')}</Title>
                        <Text c="dimmed">{t('library.subtitle')}</Text>
                    </Stack>
                    <Button
                        component={Link}
                        href="/generator"
                        variant="gradient"
                        gradient={{ from: 'hesego.6', to: 'hesego.8' }}
                        leftSection={<IconCode size={18} />}
                        w={{ base: '100%', sm: 'auto' }}
                    >
                        {t('library.new_template')}
                    </Button>
                </Group>

                <Tabs value={activeCategory} onChange={setActiveCategory} variant="pills" color="hesego">
                    <Tabs.List style={{ overflowX: 'auto', flexWrap: 'nowrap', paddingBottom: '8px' }}>
                        {categories.map(cat => (
                            <Tabs.Tab key={cat} value={cat}>
                                {cat}
                            </Tabs.Tab>
                        ))}
                    </Tabs.List>

                    <Box mt="xl">
                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                            {filteredTemplates.map((templateItem) => (
                                <Card
                                    key={templateItem.id}
                                    withBorder
                                    p="xl"
                                    className="glass-card"
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        transition: 'all 0.2s ease',
                                        borderRadius: '24px',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    <Group justify="space-between" mb="sm" wrap="nowrap">
                                        <Group gap={6}>
                                            <Badge variant="filled" color="hesego.6" size="sm" radius="xs">
                                                {templateItem.category || 'Others'}
                                            </Badge>
                                            <Badge variant="light" color="gray" size="sm" radius="xs">
                                                {templateItem.resource_type.split('_').pop()}
                                            </Badge>
                                        </Group>
                                        <ActionIcon
                                            variant="subtle"
                                            color="red"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(templateItem.id);
                                            }}
                                        >
                                            <IconTrash size={14} />
                                        </ActionIcon>
                                    </Group>

                                    <Title order={4} mb={4} lineClamp={1} style={{ fontFamily: 'var(--font-outfit)' }}>
                                        {templateItem.name}
                                    </Title>
                                    <Text size="sm" c="dimmed" mb="xl" lineClamp={2} style={{ minHeight: '3em' }}>
                                        {templateItem.description || t('library.no_description_provided')}
                                    </Text>

                                    <SimpleGrid cols={2} mt="auto" spacing="xs">
                                        <Button
                                            variant="light"
                                            color="hesego"
                                            leftSection={<IconEye size={16} />}
                                            onClick={() => handleOpenDetails(templateItem)}
                                        >
                                            {t('common.details')}
                                        </Button>
                                        <Button
                                            color="hesego"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenDeploy(templateItem);
                                            }}
                                            leftSection={<IconRocket size={16} />}
                                        >
                                            {t('common.deploy')}
                                        </Button>
                                    </SimpleGrid>
                                </Card>
                            ))}
                        </SimpleGrid>

                        {filteredTemplates.length === 0 && (
                            <Center py={100}>
                                <Stack align="center" gap="sm">
                                    <Text size="lg" fw={500} c="dimmed">{t('library.no_templates_category')}</Text>
                                    <Text size="sm" c="dimmed">{t('library.try_another_category')}</Text>
                                </Stack>
                            </Center>
                        )}
                    </Box>
                </Tabs>

                <TemplateDetailsModal
                    opened={detailsOpened}
                    onClose={closeDetails}
                    template={selectedTemplate}
                    onDeploy={handleOpenDeploy}
                    onUpdate={handleUpdateTemplate}
                />

                <DeployModal
                    opened={deployOpened}
                    onClose={closeDeploy}
                    template={selectedTemplate}
                    tenants={tenants}
                    prefilledParams={prefilledParams}
                />

                {templates.length === 0 && (
                    <Center p="xl">
                        <Stack align="center">
                            <Text c="dimmed">{t('library.no_templates')}</Text>
                            <Button component={Link} href="/generator" variant="subtle">{t('library.create_first')}</Button>
                        </Stack>
                    </Center>
                )}

            </Stack>
        </DashboardLayout>
    );
}
