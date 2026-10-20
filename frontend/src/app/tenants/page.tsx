'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
    Title,
    Text,
    Stack,
    Card,
    Group,
    Button,
    TextInput,
    PasswordInput,
    Modal,
    Table,
    Badge,
    ActionIcon,
    Loader,
    Center,
    Box,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconPlus, IconExternalLink, IconTrash } from '@tabler/icons-react';
import { TenantAppService } from '@/services/api';
import { useDisclosure } from '@mantine/hooks';
import { useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { maskId } from '@/utils/masking';

export default function TenantsPage() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [opened, { open, close }] = useDisclosure(false);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const { t } = useTranslation();
    const { user, isLoading: authLoading } = useAuth();

    const form = useForm({
        initialValues: {
            name: '',
            tenant_id: '',
            client_id: '',
            client_secret: '',
            subscription_id: '',
        },
    });

    useEffect(() => {
        if (!authLoading && user) {
            fetchTenants();
        }
    }, [user, authLoading]);

    const fetchTenants = async () => {
        setFetching(true);
        try {
            const data = await TenantAppService.list();
            setTenants(data || []);
        } catch (error) {
            console.error(error);
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (values: any) => {
        setLoading(true);
        try {
            await TenantAppService.create(values);
            notifications.show({ title: t('common.success'), message: 'Azure Tenant connected', color: 'green' });
            close();
            form.reset();
            fetchTenants();
        } catch (error) {
            notifications.show({ title: t('common.error'), message: 'Failed to connect tenant', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id: string) => {
        modals.openConfirmModal({
            title: t('common.confirm_action'),
            centered: true,
            children: <Text size="sm">Are you sure you want to delete this tenant?</Text>,
            labels: { confirm: t('common.delete'), cancel: t('common.cancel') },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                try {
                    await TenantAppService.delete(id);
                    notifications.show({ title: t('common.success'), message: 'Tenant removed', color: 'green' });
                    fetchTenants();
                } catch (error) {
                    notifications.show({ title: t('common.error'), message: 'Failed to delete tenant', color: 'red' });
                }
            }
        });
    }

    return (
        <DashboardLayout>
            <Stack>
                <Group justify="space-between" wrap="wrap" gap="md">
                    <Stack gap={0}>
                        <Title order={2}>{t('tenants.title')}</Title>
                        <Text c="dimmed">{t('tenants.subtitle')}</Text>
                    </Stack>
                    <Button onClick={open} leftSection={<IconPlus size={16} />} w={{ base: '100%', sm: 'auto' }}>{t('tenants.new_tenant')}</Button>
                </Group>

                <Card withBorder className="glass-card" style={{ borderRadius: '24px' }} p="xl">
                    <Box style={{ overflowX: 'auto' }}>
                        <Table verticalSpacing="sm" style={{ minWidth: 600 }}>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>{t('tenants.name')}</Table.Th>
                                    <Table.Th>Tenant ID</Table.Th>
                                    <Table.Th>{t('tenants.subscription_id')}</Table.Th>
                                    <Table.Th>{t('common.date')}</Table.Th>
                                    <Table.Th />
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {tenants.map((tenant) => (
                                    <Table.Tr key={tenant.id}>
                                        <Table.Td fw={600}>{tenant.name}</Table.Td>
                                        <Table.Td><Text size="xs" ff="monospace">{maskId(tenant.tenant_id)}</Text></Table.Td>
                                        <Table.Td><Text size="xs" ff="monospace">{maskId(tenant.subscription_id)}</Text></Table.Td>
                                        <Table.Td>{new Date(tenant.created_at).toLocaleDateString()}</Table.Td>
                                        <Table.Td>
                                            <Group gap="xs" justify="flex-end">
                                                <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(tenant.id)}><IconTrash size={16} /></ActionIcon>
                                            </Group>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Box>

                    {fetching || authLoading ? (
                        <Center p="xl"><Loader size="lg" variant="dots" /></Center>
                    ) : (
                        tenants.length === 0 && (
                            <Text p="xl" ta="center" c="dimmed">{t('tenants.no_tenants')}</Text>
                        )
                    )}
                </Card>

                <Modal opened={opened} onClose={close} title={t('tenants.new_tenant')} size="md">
                    <form onSubmit={form.onSubmit(handleSubmit)}>
                        <Stack gap="md">
                            {[
                                { name: 'name', label: t('tenants.name'), placeholder: 'e.g. Production Azure' },
                                { name: 'tenant_id', label: 'Tenant ID', placeholder: '00000000-...' },
                                { name: 'client_id', label: 'Client ID (App ID)', placeholder: '00000000-...' },
                                { name: 'subscription_id', label: t('tenants.subscription_id'), placeholder: '00000000-...' },
                            ].map((field) => (
                                <TextInput
                                    key={field.name}
                                    label={field.label}
                                    placeholder={field.placeholder}
                                    required
                                    {...form.getInputProps(field.name)}
                                    styles={{
                                        label: { marginBottom: '6px', fontWeight: 600 },
                                        input: {
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid var(--mantine-color-default-border)',
                                            '&:focus': { borderColor: 'var(--mantine-color-hesego-5)' }
                                        }
                                    }}
                                />
                            ))}
                            <PasswordInput
                                label="Client Secret"
                                placeholder="Your app secret"
                                required
                                {...form.getInputProps('client_secret')}
                                styles={{
                                    label: { marginBottom: '6px', fontWeight: 600 },
                                    input: {
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid var(--mantine-color-default-border)',
                                        '&:focus': { borderColor: 'var(--mantine-color-hesego-5)' }
                                    }
                                }}
                            />
                            <Button
                                type="submit"
                                fullWidth
                                loading={loading}
                                mt="lg"
                                variant="gradient"
                                radius="md"
                                gradient={{ from: 'hesego.6', to: 'hesego.8' }}
                            >
                                {t('common.connect')}
                            </Button>
                        </Stack>
                    </form>
                </Modal>
            </Stack>
        </DashboardLayout>
    );
}
