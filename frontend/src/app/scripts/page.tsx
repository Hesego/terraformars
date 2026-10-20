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
    Loader,
    Center,
    Box,
    ThemeIcon,
    Tabs,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconTerminal2, IconTrash, IconEdit, IconPlus, IconBrandPowershell, IconCode, IconArrowLeft } from '@tabler/icons-react';
import { ScriptAppService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { ScriptModal } from '@/components/ScriptModal';

export default function ScriptsPage() {
    const [scripts, setScripts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLanguage, setSelectedLanguage] = useState<'powershell' | 'bash' | null>(null);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedScript, setSelectedScript] = useState<any>(null);
    const [modalOpened, { open: openModal, close: closeModal }] = useDisclosure(false);
    const { user, isLoading: authLoading } = useAuth();
    const { t } = useTranslation();

    useEffect(() => {
        if (user) {
            fetchScripts();
        } else if (!authLoading && !user) {
            setLoading(false);
        }
    }, [user, authLoading]);

    const fetchScripts = async () => {
        try {
            const data = await ScriptAppService.list();
            setScripts(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedScript(null);
        openModal();
    };

    const handleEdit = (script: any) => {
        setSelectedScript(script);
        openModal();
    };

    const handleDelete = (id: string) => {
        modals.openConfirmModal({
            title: t('common.confirm_action'),
            centered: true,
            children: <Text size="sm">{t('scripts.delete_confirm')}</Text>,
            labels: { confirm: t('common.delete'), cancel: t('common.cancel') },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                try {
                    await ScriptAppService.delete(id);
                    notifications.show({ title: t('common.success'), message: t('scripts.deleted'), color: 'green' });
                    fetchScripts();
                } catch (error) {
                    notifications.show({ title: t('common.error'), message: t('scripts.delete_error'), color: 'red' });
                }
            }
        });
    };

    if (authLoading || (loading && scripts.length === 0)) return (
        <DashboardLayout>
            <Center h="70vh"><Loader color="jhamf.6" size="xl" /></Center>
        </DashboardLayout>
    );

    const filteredScripts = selectedLanguage 
        ? scripts.filter(s => {
            const langMatch = s.language === selectedLanguage;
            const catMatch = selectedCategory === 'all' || s.category === selectedCategory;
            return langMatch && catMatch;
        })
        : [];

    const categories = [
        { value: 'all', label: t('common.all') || 'Todos' },
        { value: 'installation', label: t('scripts.categories.installation') },
        { value: 'configuration', label: t('scripts.categories.configuration') },
        { value: 'maintenance', label: t('scripts.categories.maintenance') },
        { value: 'monitoring', label: t('scripts.categories.monitoring') },
        { value: 'security', label: t('scripts.categories.security') },
        { value: 'deployment', label: t('scripts.categories.deployment') },
        { value: 'troubleshooting', label: t('scripts.categories.troubleshooting') },
        { value: 'utilities', label: t('scripts.categories.utilities') },
        { value: 'other', label: t('scripts.categories.other') }
    ];

    return (
        <DashboardLayout>
            <Stack gap="xl">
                <Group justify="space-between" align="flex-end">
                    <Stack gap={0}>
                        <Group gap="xs">
                            {selectedLanguage && (
                                <ActionIcon variant="subtle" color="jhamf" onClick={() => setSelectedLanguage(null)}>
                                    <IconArrowLeft size={18} />
                                </ActionIcon>
                            )}
                            <Title order={1}>
                                {selectedLanguage 
                                    ? t('scripts.scripts_for', { lang: selectedLanguage === 'powershell' ? 'PowerShell' : 'Bash' })
                                    : t('scripts.title')}
                            </Title>
                        </Group>
                        <Text c="dimmed">
                            {selectedLanguage 
                                ? t('scripts.manage_for', { os: selectedLanguage === 'powershell' ? 'Windows' : 'Linux' })
                                : t('scripts.subtitle')}
                        </Text>
                    </Stack>
                    <Button
                        variant="gradient"
                        gradient={{ from: 'jhamf.6', to: 'jhamf.8' }}
                        leftSection={<IconPlus size={18} />}
                        onClick={handleCreate}
                    >
                        {t('scripts.new_script')}
                    </Button>
                </Group>

                {!selectedLanguage ? (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
                        <Card 
                            withBorder 
                            p={40} 
                            radius="xl"
                            className="glass-card clickable-card"
                            onClick={() => setSelectedLanguage('powershell')}
                            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                        >
                            <Stack align="center" gap="md">
                                <ThemeIcon size={80} radius="24px" color="blue" variant="light">
                                    <IconBrandPowershell size={44} />
                                </ThemeIcon>
                                <Title order={2}>PowerShell</Title>
                                <Text ta="center" c="dimmed">{t('scripts.powershell_desc')}</Text>
                                <Badge size="lg" color="blue" variant="light">
                                    {scripts.filter(s => s.language === 'powershell').length} Scripts
                                </Badge>
                            </Stack>
                        </Card>

                        <Card 
                            withBorder 
                            p={40} 
                            radius="xl"
                            className="glass-card clickable-card"
                            onClick={() => setSelectedLanguage('bash')}
                            style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                        >
                            <Stack align="center" gap="md">
                                <ThemeIcon size={80} radius="24px" color="green" variant="light">
                                    <IconTerminal2 size={44} />
                                </ThemeIcon>
                                <Title order={2}>Bash / Shell</Title>
                                <Text ta="center" c="dimmed">{t('scripts.bash_desc')}</Text>
                                <Badge size="lg" color="green" variant="light">
                                    {scripts.filter(s => s.language === 'bash').length} Scripts
                                </Badge>
                            </Stack>
                        </Card>
                    </SimpleGrid>
                ) : (
                    <>
                        <Box mb="xl">
                            <Tabs value={selectedCategory} onChange={(v) => setSelectedCategory(v || 'all')} color="jhamf">
                                <Tabs.List>
                                    {categories.map(cat => (
                                        <Tabs.Tab key={cat.value} value={cat.value}>
                                            {cat.label}
                                        </Tabs.Tab>
                                    ))}
                                </Tabs.List>
                            </Tabs>
                        </Box>

                        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                            {filteredScripts.map((script) => (
                                <Card
                                    key={script.id}
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
                                     <Group justify="space-between" mb="sm">
                                        <ThemeIcon 
                                            variant="light" 
                                            color={script.language === 'powershell' ? 'blue' : 'green'} 
                                            size="lg" 
                                            radius="md"
                                        >
                                            {script.language === 'powershell' ? <IconBrandPowershell size={20} /> : <IconTerminal2 size={20} />}
                                        </ThemeIcon>
                                        <Group gap={6}>
                                            <Badge variant="filled" color="jhamf.6" size="sm">
                                                {t(`scripts.categories.${script.category}`) || script.category || 'General'}
                                            </Badge>
                                        </Group>
                                    </Group>

                                    <Title order={4} mb={4} lineClamp={1}>
                                        {script.name}
                                    </Title>
                                    <Text size="sm" c="dimmed" mb="xl" lineClamp={2} style={{ minHeight: '3em' }}>
                                        {script.description || t('scripts.no_description')}
                                    </Text>

                                    <Group mt="auto" justify="space-between">
                                        <Badge variant="light" color="gray" size="xs">
                                            {script.language === 'powershell' ? 'PowerShell' : 'Bash'}
                                        </Badge>
                                        <Group gap="xs">
                                            <ActionIcon variant="subtle" color="jhamf" onClick={() => handleEdit(script)}>
                                                <IconEdit size={18} />
                                            </ActionIcon>
                                            <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(script.id)}>
                                                <IconTrash size={18} />
                                            </ActionIcon>
                                        </Group>
                                    </Group>
                                </Card>
                            ))}
                        </SimpleGrid>

                        {filteredScripts.length === 0 && (
                            <Center py={100}>
                                <Stack align="center" gap="sm">
                                    <ThemeIcon size={60} radius={60} variant="light" color="gray">
                                        <IconCode size={34} />
                                    </ThemeIcon>
                                    <Text size="lg" fw={500} c="dimmed">{t('scripts.no_scripts')}</Text>
                                    <Button variant="subtle" color="jhamf" onClick={handleCreate}>{t('scripts.create_first', { lang: selectedLanguage })}</Button>
                                </Stack>
                            </Center>
                        )}
                    </>
                )}

                <ScriptModal 
                    opened={modalOpened} 
                    onClose={closeModal} 
                    script={selectedScript} 
                    onSave={fetchScripts} 
                />
            </Stack>

            <style jsx global>{`
                .clickable-card:hover {
                    border-color: var(--mantine-color-terra-6) !important;
                    background: rgba(255, 165, 0, 0.05) !important;
                    transform: translateY(-8px);
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1) !important;
                }
            `}</style>
        </DashboardLayout>
    );
}
