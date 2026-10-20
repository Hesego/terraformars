'use client';

import { useState, useEffect } from 'react';
import {
    Modal,
    Button,
    Stack,
    Text,
    Group,
    Badge,
    Card,
    Tabs,
    ScrollArea,
    TextInput,
    Textarea,
} from '@mantine/core';
import { IconRocket, IconCode, IconListDetails, IconDeviceFloppy, IconEdit, IconSparkles, IconSend } from '@tabler/icons-react';
import { CodeHighlight } from '@mantine/code-highlight';
import { notifications } from '@mantine/notifications';
import { TemplateAppService } from '@/services/api';
import { useTranslation } from 'react-i18next';

interface TemplateDetailsModalProps {
    opened: boolean;
    onClose: () => void;
    template: any;
    onDeploy: (template: any, prefilledParams?: Record<string, string>) => void;
    onUpdate?: (updatedTemplate: any) => void;
}

export function TemplateDetailsModal({ opened, onClose, template, onDeploy, onUpdate }: TemplateDetailsModalProps) {
    const [varValues, setVarValues] = useState<Record<string, string>>({});
    const [isEditing, setIsEditing] = useState(false);
    const [isAiEditing, setIsAiEditing] = useState(false);
    const [editedCode, setEditedCode] = useState('');
    const [aiPrompt, setAiPrompt] = useState('');
    const [saving, setSaving] = useState(false);
    const [refining, setRefining] = useState(false);
    const { t } = useTranslation();

    // Reset values when template changes
    useEffect(() => {
        if (template?.extracted_variables) {
            const defaults: Record<string, string> = {};
            template.extracted_variables.forEach((v: any) => {
                defaults[v.name] = v.default || '';
            });
            setVarValues(defaults);
        }
        setIsEditing(false);
        setIsAiEditing(false);
        setAiPrompt('');
        setEditedCode(template?.terraform_code || '');
    }, [template]);

    if (!template) return null;

    const handleVarChange = (name: string, value: string) => {
        setVarValues(prev => ({ ...prev, [name]: value }));
    };

    const handleDeploy = () => {
        onDeploy(template, varValues);
    };

    const handleSaveCode = async () => {
        setSaving(true);
        try {
            const updated = await TemplateAppService.update(template.id, { terraform_code: editedCode });
            notifications.show({ title: t('common.success'), message: 'Template code updated successfully', color: 'green' });
            setIsEditing(false);
            if (onUpdate) onUpdate(updated);
        } catch (error) {
            notifications.show({ title: t('common.error'), message: 'Failed to update template code', color: 'red' });
        } finally {
            setSaving(false);
        }
    };

    const handleAiRefine = async () => {
        if (!aiPrompt.trim()) return;
        setRefining(true);
        try {
            const updated = await TemplateAppService.refine(template.id, aiPrompt);
            notifications.show({ 
                title: t('common.success'), 
                message: 'Template refined by AI Assistant', 
                color: 'blue',
                icon: <IconSparkles size={16} /> 
            });
            setIsAiEditing(false);
            setAiPrompt('');
            if (onUpdate) onUpdate(updated);
        } catch (error) {
            notifications.show({ title: t('common.error'), message: 'AI refinement failed', color: 'red' });
        } finally {
            setRefining(false);
        }
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={template.name}
            size="xl"
            radius="md"
        >
            <Stack>
                <Group justify="space-between">
                    <Group>
                        <Badge variant="filled" color="jhamf.6" size="lg">{template.category || 'Others'}</Badge>
                        <Badge variant="light" color="jhamf.6" size="lg">{template.resource_type}</Badge>
                        <Badge variant="outline" color="gray">v1.0.0</Badge>
                    </Group>
                </Group>

                <Group justify="space-between">
                    <Text size="sm" c="dimmed">
                        {template.description || t('modals.template_details.no_description')}
                    </Text>
                    {template.created_at && (
                        <Text size="xs" c="dimmed">
                            {t('modals.template_details.created')} {new Date(template.created_at).toLocaleDateString()}
                        </Text>
                    )}
                </Group>

                <Tabs defaultValue="variables" color="jhamf.6">
                    <Tabs.List>
                        <Tabs.Tab value="variables" leftSection={<IconListDetails size={16} />}>
                            {t('modals.template_details.variables')}
                        </Tabs.Tab>
                        <Tabs.Tab value="code" leftSection={<IconCode size={16} />}>
                            {t('modals.template_details.terraform_code')}
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="variables" pt="md">
                        <Stack gap="sm">
                            {template.extracted_variables?.length > 0 ? (
                                template.extracted_variables.map((v: any) => (
                                    <TextInput
                                        key={v.name}
                                        label={
                                            <Group gap="xs">
                                                <Text fw={600} size="sm">{v.name}</Text>
                                                <Badge variant="outline" size="xs" color="gray">{v.type}</Badge>
                                            </Group>
                                        }
                                        description={v.description || undefined}
                                        placeholder={v.default ? t('modals.template_details.default', { val: v.default }) : t('modals.template_details.enter_value', { name: v.name })}
                                        value={varValues[v.name] || ''}
                                        onChange={(e) => handleVarChange(v.name, e.currentTarget.value)}
                                        styles={{
                                            input: {
                                                fontFamily: 'monospace',
                                            }
                                        }}
                                    />
                                ))
                            ) : (
                                <Text ta="center" py="xl" c="dimmed">{t('modals.template_details.no_variables')}</Text>
                            )}
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="code" pt="md">
                        <Stack gap="sm">
                            <Group justify="end">
                                {isEditing || isAiEditing ? (
                                    <Group>
                                        <Button 
                                            variant="subtle" 
                                            color="gray" 
                                            onClick={() => {
                                                setIsEditing(false);
                                                setIsAiEditing(false);
                                            }}
                                            disabled={saving || refining}
                                        >
                                            {t('common.cancel')}
                                        </Button>
                                        {isEditing && (
                                            <Button
                                                leftSection={<IconDeviceFloppy size={16} />}
                                                color="jhamf.6"
                                                onClick={handleSaveCode}
                                                loading={saving}
                                            >
                                                {t('modals.template_details.save_changes')}
                                            </Button>
                                        )}
                                    </Group>
                                ) : (
                                    <Group gap="xs">
                                        <Button
                                            variant="light"
                                            color="blue"
                                            leftSection={<IconSparkles size={16} />}
                                            onClick={() => setIsAiEditing(true)}
                                        >
                                            Asistente IA
                                        </Button>
                                        <Button
                                            variant="light"
                                            color="jhamf.6"
                                            leftSection={<IconEdit size={16} />}
                                            onClick={() => {
                                                setEditedCode(template.terraform_code);
                                                setIsEditing(true);
                                            }}
                                        >
                                            {t('modals.template_details.edit_code')}
                                        </Button>
                                    </Group>
                                )}
                            </Group>

                            {isAiEditing && (
                                <Card withBorder p="md" radius="md" style={{ backgroundColor: 'var(--mantine-color-blue-light)' }}>
                                    <Stack gap="xs">
                                        <Text size="sm" fw={600} c="blue">¿Cómo quieres que el Asistente IA edite este código?</Text>
                                        <Group align="flex-end">
                                            <TextInput 
                                                style={{ flex: 1 }}
                                                placeholder="Ej: Agrega un disco duro adicional de 128GB..."
                                                value={aiPrompt}
                                                onChange={(e) => setAiPrompt(e.currentTarget.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleAiRefine()}
                                            />
                                            <Button 
                                                variant="filled" 
                                                color="blue" 
                                                onClick={handleAiRefine} 
                                                loading={refining}
                                                leftSection={<IconSend size={16} />}
                                            >
                                                Refinar
                                            </Button>
                                        </Group>
                                    </Stack>
                                </Card>
                            )}

                            <Card withBorder padding={0} radius="md">
                                <ScrollArea h={400} type="always">
                                    {isEditing ? (
                                        <Textarea
                                            value={editedCode}
                                            onChange={(e) => setEditedCode(e.currentTarget.value)}
                                            autosize
                                            minRows={20}
                                            styles={{
                                                input: {
                                                    fontFamily: 'monospace',
                                                    fontSize: '14px',
                                                    color: 'var(--mantine-color-text)',
                                                    backgroundColor: 'var(--mantine-color-body)',
                                                    border: 'none',
                                                    padding: '1rem',
                                                }
                                            }}
                                        />
                                    ) : (
                                        <CodeHighlight
                                            code={template.terraform_code}
                                            language="hcl"
                                            withCopyButton
                                        />
                                    )}
                                </ScrollArea>
                            </Card>
                        </Stack>
                    </Tabs.Panel>
                </Tabs>

                <Button
                    fullWidth
                    leftSection={<IconRocket size={16} />}
                    onClick={handleDeploy}
                    mt="md"
                    size="md"
                    variant="gradient"
                    gradient={{ from: 'jhamf.6', to: 'jhamf.8' }}
                    disabled={isEditing}
                >
                    {t('modals.template_details.prepare_deployment')}
                </Button>
            </Stack>
        </Modal>
    );
}

