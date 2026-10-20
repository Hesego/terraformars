'use client';

import { useState, useEffect } from 'react';
import {
    Modal,
    Button,
    Stack,
    Select,
    TextInput,
    Title,
    Text,
    Divider,
    Alert,
    MultiSelect,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconRocket, IconAlertCircle } from '@tabler/icons-react';
import { DeploymentAppService, TenantAppService, ScriptAppService } from '@/services/api';
import { notifications } from '@mantine/notifications';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

interface DeployModalProps {
    opened: boolean;
    onClose: () => void;
    template: any;
    tenants: any[];
    prefilledParams?: Record<string, string>;
}

export function DeployModal({ opened, onClose, template, tenants, prefilledParams }: DeployModalProps) {
    const [loading, setLoading] = useState(false);
    const [scripts, setScripts] = useState<any[]>([]);
    const router = useRouter();
    const { t } = useTranslation();

    const form = useForm({
        initialValues: {
            tenant_id: '',
            parameters: {},
            script_ids: [] as string[],
        },
    });

    useEffect(() => {
        if (template) {
            const defaults = template.extracted_variables?.reduce((acc: any, v: any) => {
                acc[v.name] = v.default || '';
                return acc;
            }, {}) || {};
            // Merge prefilled values over defaults
            const merged = { ...defaults, ...(prefilledParams || {}) };
            form.setValues({
                tenant_id: '',
                parameters: merged,
                script_ids: [],
            });
            fetchScripts();
        }
    }, [template, prefilledParams]);

    const fetchScripts = async () => {
        try {
            const data = await ScriptAppService.list();
            setScripts(data);
        } catch (e) {
            console.error(e);
        }
    };

    const handleDeploy = async (values: any) => {
        if (!template?.id) {
            notifications.show({ title: t('common.error'), message: 'Invalid template selection', color: 'red' });
            return;
        }
        setLoading(true);
        try {
            await DeploymentAppService.create({
                template_id: template.id,
                tenant_id: values.tenant_id,
                parameters: values.parameters,
                script_ids: values.script_ids,
            });
            notifications.show({
                title: t('common.success'),
                message: 'Deployment started successfully',
                color: 'green',
            });
            onClose();
            router.push('/deployments');
        } catch (error) {
            notifications.show({
                title: t('common.error'),
                message: 'Failed to start deployment',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    };

    if (!template) return null;

    return (
        <Modal opened={opened} onClose={onClose} title={t('modals.deploy.title', { name: template.name })} size="lg">
            <form onSubmit={form.onSubmit(handleDeploy)}>
                <Stack>
                    <Select
                        label={t('modals.deploy.azure_tenant')}
                        placeholder={t('modals.deploy.select_tenant')}
                        data={tenants.map(t => ({ value: t.id, label: t.name }))}
                        required
                        {...form.getInputProps('tenant_id')}
                    />

                    <Divider label={t('modals.deploy.parameters')} labelPosition="center" />

                    {template.extracted_variables?.length === 0 && (
                        <Alert icon={<IconAlertCircle size={16} />} color="blue">
                            {t('modals.deploy.no_variables')}
                        </Alert>
                    )}

                    {template.extracted_variables?.map((v: any) => (
                        <TextInput
                            key={v.name}
                            label={v.name}
                            description={v.description}
                            placeholder={t('modals.template_details.enter_value', { name: v.name })}
                            required
                            {...form.getInputProps(`parameters.${v.name}`)}
                        />
                    ))}

                    <Divider label="Configuración Adicional (Scripts)" labelPosition="center" />
                    <MultiSelect
                        label="Scripts de Post-Instalación"
                        description="Ejecutar scripts automáticamente después del despliegue"
                        placeholder="Selecciona scripts..."
                        data={scripts.map(s => ({ 
                            value: s.id, 
                            label: `${s.name} (${s.language})` 
                        }))}
                        {...form.getInputProps('script_ids')}
                    />

                    <Button
                        type="submit"
                        fullWidth
                        loading={loading}
                        leftSection={<IconRocket size={16} />}
                        gradient={{ from: 'jhamf.6', to: 'jhamf.8' }}
                        variant="gradient"
                        mt="md"
                    >
                        {t('modals.deploy.execute_deployment')}
                    </Button>
                </Stack>
            </form>
        </Modal>
    );
}
