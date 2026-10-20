'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DeployModal } from '@/components/DeployModal';
import {
    TextInput,
    Button,
    Stack,
    Title,
    Text,
    Card,
    Group,
    ActionIcon,
    LoadingOverlay,
    Box,
    Badge,
    Select,
    Textarea,
    SimpleGrid,
} from '@mantine/core';
import { IconSend, IconDeviceFloppy, IconRocket, IconSettings2, IconRefresh, IconBrackets, IconCode } from '@tabler/icons-react';
import { TemplateAppService, TenantAppService, DeploymentAppService } from '@/services/api';
import { CodeHighlight } from '@mantine/code-highlight';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';

import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';

export default function GeneratorPage() {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [costLoading, setCostLoading] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [category, setCategory] = useState<string | null>(null);
    const [deployModalOpened, setDeployModalOpened] = useState(false);
    const [tenants, setTenants] = useState<any[]>([]);
    const router = useRouter();
    const { t } = useTranslation();
    const { user, isLoading: authLoading } = useAuth();

    useEffect(() => {
        if (!authLoading && user) {
            TenantAppService.list().then(setTenants).catch(() => { });
        }
    }, [user, authLoading]);

    const categories = [
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

    const handleGenerate = async () => {
        if (!description || !name) {
            notifications.show({
                title: t('common.error'),
                message: 'Please provide both a name and a description',
                color: 'yellow',
            });
            return;
        }
        setResult(null); // Reset result to avoid confusion
        setLoading(true);
        try {
            const data = await TemplateAppService.generate(description, name);
            setResult(data);
            if (!category && data.category) {
                setCategory(data.category);
            }
        } catch (error) {
            notifications.show({
                title: t('common.error'),
                message: 'Could not generate template',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        try {
            await TemplateAppService.save({ ...result, category: category || result.category || 'Others' });
            notifications.show({
                title: t('common.success'),
                message: 'Template saved to library',
                color: 'green',
            });
            router.push('/library');
        } catch (error) {
            notifications.show({
                title: t('common.error'),
                message: 'Could not save template',
                color: 'red',
            });
        }
    };

    const handleScaleAttribute = (resourceId: string, attribute: string, newValue: string) => {
        if (!result) return;

        // resourceId is like 'azurerm_linux_virtual_machine.vm'
        const [type, rName] = resourceId.split('.');

        // Regex to find the resource block and then the attribute within it
        // Note: This is an approximation since parsing HCL with regex is tricky.
        const escapedType = type.replace(/\./g, '\\.');
        const escapedName = rName.replace(/\./g, '\\.');
        const regex = new RegExp(`(resource\\s+["']${escapedType}["']\\s+["']${escapedName}["']\\s*\\{[^}]*?${attribute}\\s*=\\s*)(["'][^"']+["']|[^\\s\\n]+)`, 'gi');

        const newCode = result.terraform_code.replace(regex, (match: string, p1: string, p2: string) => {
            const quote = p2.startsWith('"') || p2.startsWith("'") ? '"' : '';
            return `${p1}${quote}${newValue}${quote}`;
        });

        setResult({ ...result, terraform_code: newCode });
    };

    const handleDeployNow = async () => {
        if (!result.id) {
            setLoading(true);
            try {
                const saved = await TemplateAppService.save({ ...result, category: category || result.category || 'Others' });
                setResult(saved);
                setDeployModalOpened(true);
            } catch (error) {
                notifications.show({
                    title: t('common.error'),
                    message: 'Could not prepare template for deployment',
                    color: 'red',
                });
            } finally {
                setLoading(false);
            }
        } else {
            setDeployModalOpened(true);
        }
    };

    return (
        <DashboardLayout>
            <Stack pos="relative">
                <LoadingOverlay visible={loading} />

                <Box>
                    <Title order={2}>{t('generator.title')}</Title>
                    <Text c="dimmed">{t('generator.subtitle')}</Text>
                </Box>

                <Card withBorder p={{ base: 'md', sm: 'xl' }} className="glass-card" style={{ borderRadius: '24px' }}>
                    <Stack gap="md">
                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                            <TextInput
                                label={t('generator.template_name')}
                                placeholder={t('generator.template_name_placeholder')}
                                required
                                value={name}
                                onChange={(e) => setName(e.currentTarget.value)}
                                styles={(theme) => ({
                                    label: { marginBottom: '8px', fontWeight: 600 },
                                    input: {
                                        backgroundColor: 'var(--glass-input-bg)',
                                        border: '1px solid var(--glass-border)',
                                        transition: 'all 0.2s ease',
                                        '&:focus': {
                                            borderColor: 'var(--mantine-color-terra-5)',
                                            backgroundColor: 'rgba(16, 137, 235, 0.05)',
                                        }
                                    }
                                })}
                            />
                            <Select
                                label={t('generator.category')}
                                placeholder={t('generator.category_placeholder')}
                                data={categories}
                                value={category}
                                onChange={setCategory}
                                clearable
                                styles={(theme) => ({
                                    label: { marginBottom: '8px', fontWeight: 600 },
                                    input: {
                                        backgroundColor: 'var(--glass-input-bg)',
                                        border: '1px solid var(--glass-border)',
                                        transition: 'all 0.2s ease',
                                        '&:focus': {
                                            borderColor: 'var(--mantine-color-terra-5)',
                                            backgroundColor: 'rgba(16, 137, 235, 0.05)',
                                        }
                                    },
                                    dropdown: {
                                        backgroundColor: 'var(--mantine-color-body)',
                                        backdropFilter: 'blur(20px)',
                                        border: '1px solid var(--mantine-color-default-border)',
                                    }
                                })}
                            />
                        </SimpleGrid>
                        <Stack gap="xs" align="stretch">
                            <Textarea
                                label={t('generator.describe_resource')}
                                placeholder={t('generator.describe_resource_placeholder')}
                                style={{ flex: 1 }}
                                required
                                value={description}
                                onChange={(e) => setDescription(e.currentTarget.value)}
                                autosize
                                minRows={3}
                                maxRows={10}
                                styles={(theme) => ({
                                    label: { marginBottom: '8px', fontWeight: 600 },
                                    input: {
                                        backgroundColor: 'var(--glass-input-bg)',
                                        border: '1px solid var(--glass-border)',
                                        transition: 'all 0.2s ease',
                                        '&:focus': {
                                            borderColor: 'var(--mantine-color-terra-5)',
                                            backgroundColor: 'rgba(16, 137, 235, 0.05)',
                                        }
                                    }
                                })}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleGenerate();
                                    }
                                }}
                            />
                            <Button
                                variant="gradient"
                                gradient={{ from: 'hesego.6', to: 'hesego.8' }}
                                onClick={handleGenerate}
                                leftSection={<IconSend size={16} />}
                                fullWidth
                            >
                                {t('generator.generate')}
                            </Button>
                        </Stack>
                    </Stack>
                </Card>

                {result && (
                    <Stack gap="lg">
                        <Group justify="space-between" align="center" wrap="wrap" gap="md">
                            <Group gap="xs" wrap="wrap">
                                <Title order={4}>{result.name}</Title>
                                <Badge color="hesego.6">{category || result.category || 'Uncategorized'}</Badge>
                                {result.estimated_cost !== undefined && (
                                    <Badge variant="dot" color="green" size="lg">
                                        Est. ${result.estimated_cost}/mo
                                    </Badge>
                                )}
                            </Group>
                            <Box style={{ flexGrow: 1, display: 'flex', gap: 'var(--mantine-spacing-xs)', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                <Button
                                    variant="light"
                                    onClick={handleSave}
                                    leftSection={<IconDeviceFloppy size={16} />}
                                    w={{ base: '100%', xs: 'calc(50% - 6px)', sm: 'auto' }}
                                >
                                    {t('generator.save_to_library')}
                                </Button>
                                <Button
                                    color="hesego.6"
                                    leftSection={<IconRocket size={16} />}
                                    onClick={handleDeployNow}
                                    w={{ base: '100%', xs: 'calc(50% - 6px)', sm: 'auto' }}
                                >
                                    {t('generator.deploy_now')}
                                </Button>
                            </Box>
                        </Group>

                        {result.scalable_attributes?.length > 0 && (
                            <Card withBorder p="xl" className="glass-card" style={{ borderRadius: '24px' }}>
                                <Group justify="space-between" mb="md">
                                    <Group gap="xs">
                                        <IconSettings2 size={24} color="var(--mantine-color-hesego-6)" />
                                        <Title order={5}>{t('generator.dynamic_scaling')}</Title>
                                    </Group>
                                    <Button
                                        variant="subtle"
                                        size="xs"
                                        leftSection={<IconRefresh size={14} />}
                                        loading={costLoading}
                                        onClick={async () => {
                                            setCostLoading(true);
                                            try {
                                                const { estimated_cost } = await TemplateAppService.reestimateCost(result.terraform_code);
                                                setResult({ ...result, estimated_cost });
                                                notifications.show({
                                                    title: t('common.success'),
                                                    message: t('generator.update_budget_success'),
                                                    color: 'green',
                                                });
                                            } catch (e) { } finally {
                                                setCostLoading(false);
                                            }
                                        }}
                                    >
                                        {t('generator.recalculate_cost')}
                                    </Button>
                                </Group>
                                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                                    {result.scalable_attributes.map((attr: any, idx: number) => (
                                        <Select
                                            key={`${attr.resource}-${attr.attribute}-${idx}`}
                                            label={attr.label}
                                            data={attr.options.map((opt: string) => ({ value: opt, label: opt }))}
                                            defaultValue={attr.current}
                                            onChange={(val) => val && handleScaleAttribute(attr.resource, attr.attribute, val)}
                                            styles={{
                                                label: { marginBottom: '4px', fontWeight: 600, fontSize: '13px' },
                                                input: {
                                                    backgroundColor: 'var(--glass-input-bg)',
                                                    border: '1px solid var(--glass-border)'
                                                }
                                            }}
                                        />
                                    ))}
                                </SimpleGrid>
                            </Card>
                        )}

                        <Card withBorder p={0} className="glass-card" style={{ borderRadius: '24px', overflow: 'hidden' }}>
                            <Box p="md" style={{ borderBottom: '1px solid var(--glass-border)', backgroundColor: 'var(--glass-input-bg)' }}>
                                <Group gap="xs">
                                    <IconCode size={20} color="var(--mantine-color-hesego-6)" />
                                    <Text fw={600} size="sm">Main configuration (main.tf)</Text>
                                </Group>
                            </Box>
                            <CodeHighlight
                                code={result.terraform_code}
                                language="hcl"
                                withCopyButton
                                styles={{
                                    code: { backgroundColor: 'transparent !important' },
                                    pre: { backgroundColor: 'transparent !important', padding: '20px !important' }
                                }}
                            />
                        </Card>

                        <Card withBorder p="xl" className="glass-card" style={{ borderRadius: '24px' }}>
                            <Group gap="xs" mb="lg">
                                <IconBrackets size={24} color="var(--mantine-color-hesego-6)" />
                                <Title order={5}>{t('generator.extracted_variables')}</Title>
                            </Group>
                            <Stack gap="md">
                                {result.extracted_variables.map((v: any) => (
                                    <Group key={v.name} justify="space-between" p="md" wrap="nowrap" style={{
                                        background: 'var(--glass-input-bg)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: '16px',
                                        transition: 'all 0.2s ease',
                                    }}>
                                        <Stack gap={2} style={{ overflow: 'hidden' }}>
                                            <Text fw={700} size="sm" c="hesego.5" truncate>{v.name}</Text>
                                            <Text size="xs" c="dimmed" lineClamp={2}>{v.description || t('generator.no_description')}</Text>
                                        </Stack>
                                        <Badge variant="light" size="sm" color="gray" radius="sm" style={{ flexShrink: 0 }}>
                                            {v.type.toUpperCase()}
                                        </Badge>
                                    </Group>
                                ))}
                            </Stack>
                        </Card>
                    </Stack>
                )}

            </Stack>

            <DeployModal
                opened={deployModalOpened}
                onClose={() => setDeployModalOpened(false)}
                template={result}
                tenants={tenants}
            />
        </DashboardLayout>
    );
}
