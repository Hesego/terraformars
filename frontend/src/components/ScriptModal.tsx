import { Modal, TextInput, Textarea, Select, Button, Stack, Group, Divider } from '@mantine/core';
import { useState, useEffect } from 'react';
import { ScriptAppService } from '@/services/api';
import { notifications } from '@mantine/notifications';
import { IconDeviceFloppy, IconSparkles, IconRobot } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface ScriptModalProps {
    opened: boolean;
    onClose: () => void;
    script?: any;
    onSave: () => void;
}

export function ScriptModal({ opened, onClose, script, onSave }: ScriptModalProps) {
    const { t } = useTranslation();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [content, setContent] = useState('');
    const [language, setLanguage] = useState('bash');
    const [category, setCategory] = useState('Configuration');
    const [loading, setLoading] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        if (script) {
            setName(script.name || '');
            setDescription(script.description || '');
            setContent(script.content || '');
            setLanguage(script.language || 'bash');
            setCategory(script.category || 'Configuration');
        } else {
            setName('');
            setDescription('');
            setContent('');
            setLanguage('bash');
            setCategory('Configuration');
        }
    }, [script, opened]);

    const handleSave = async () => {
        setLoading(true);
        try {
            const data = { name, description, content, language, category };
            if (script?.id) {
                await ScriptAppService.update(script.id, data);
                notifications.show({ title: 'Success', message: 'Script updated', color: 'green' });
            } else {
                await ScriptAppService.create(data);
                notifications.show({ title: 'Success', message: 'Script created', color: 'green' });
            }
            onSave();
            onClose();
        } catch (error) {
            notifications.show({ title: 'Error', message: 'Failed to save script', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleAIAssistant = async () => {
        if (!aiPrompt) return;
        setAiLoading(true);
        try {
            let result;
            if (script?.id && content) {
                // Refine
                result = await ScriptAppService.refine(script.id, aiPrompt);
            } else {
                // Generate
                result = await ScriptAppService.generate(aiPrompt, language);
            }
            setContent(result.content);
            setAiPrompt('');
            notifications.show({ 
                title: 'AI Assistant', 
                message: 'Script procesado con éxito', 
                color: 'blue',
                icon: <IconRobot size={18} />
            });
        } catch (error) {
            notifications.show({ title: 'Error', message: 'La IA no pudo procesar la solicitud', color: 'red' });
        } finally {
            setAiLoading(false);
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title={script ? "Editar Script" : "Nuevo Script"} size="lg" radius="md">
            <Stack>
                <TextInput 
                    label="Nombre del Script" 
                    placeholder="Ej: Instalar Agente Monitoreo" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)}
                    required
                />
                <TextInput 
                    label="Descripción" 
                    placeholder="Propósito del script..." 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)}
                />
                <Group grow>
                    <Select 
                        label="Lenguaje" 
                        value={language} 
                        onChange={(v) => setLanguage(v || 'bash')}
                        data={[
                            { value: 'bash', label: 'Bash (Linux)' },
                            { value: 'powershell', label: 'PowerShell (Windows)' }
                        ]}
                    />
                    <Select 
                        label="Categoría" 
                        value={category} 
                        onChange={(v) => setCategory(v || 'other')}
                        data={[
                            { value: 'installation', label: t('scripts.categories.installation') },
                            { value: 'configuration', label: t('scripts.categories.configuration') },
                            { value: 'maintenance', label: t('scripts.categories.maintenance') },
                            { value: 'monitoring', label: t('scripts.categories.monitoring') },
                            { value: 'security', label: t('scripts.categories.security') },
                            { value: 'deployment', label: t('scripts.categories.deployment') },
                            { value: 'troubleshooting', label: t('scripts.categories.troubleshooting') },
                            { value: 'utilities', label: t('scripts.categories.utilities') },
                            { value: 'other', label: t('scripts.categories.other') }
                        ]}
                    />
                </Group>
                <Textarea 
                    label="Contenido del Script" 
                    placeholder="# Escribe tu código aquí..." 
                    minRows={10} 
                    autosize
                    value={content} 
                    onChange={(e) => setContent(e.target.value)}
                    styles={{
                        input: { fontFamily: 'monospace', fontSize: '13px' }
                    }}
                    required
                />

                <Divider label="Asistente de IA" labelPosition="center" />
                <Group align="flex-end">
                    <TextInput 
                        style={{ flex: 1 }}
                        label="¿Qué quieres que haga el script?"
                        placeholder="Ej: Instala nginx y añade un archivo index.html personalizado"
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                    />
                    <Button 
                        variant="light" 
                        color="blue" 
                        leftSection={<IconSparkles size={18} />}
                        onClick={handleAIAssistant}
                        loading={aiLoading}
                        disabled={!aiPrompt}
                    >
                        {script?.id ? 'Refinar con IA' : 'Generar con IA'}
                    </Button>
                </Group>
                <Group justify="flex-end" mt="md">
                    <Button variant="light" color="gray" onClick={onClose}>Cancelar</Button>
                    <Button 
                        color="hesego" 
                        leftSection={<IconDeviceFloppy size={18} />} 
                        onClick={handleSave}
                        loading={loading}
                    >
                        Guardar Script
                    </Button>
                </Group>
            </Stack>
        </Modal>
    );
}
