'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
    Title, Text, Stack, Box, Group, ThemeIcon,
    Loader, Center, Tabs, Breadcrumbs, Anchor, ActionIcon,
    Alert, Card, Badge, Table, ScrollArea,
} from '@mantine/core';
import {
    IconCloud, IconArrowLeft, IconAlertCircle,
    IconBox, IconHierarchy2, IconRoute, IconTerminal2, IconTopologyStar,
} from '@tabler/icons-react';
import { TenantAppService, K8sAppService } from '@/services/api';
import { useTranslation } from 'react-i18next';
import { ClusterVisualizer } from '../../../components/ClusterVisualizer';

const MOCK_NODES = [
    { metadata: { name: 'aks-agentpool-12345678-vmss000000', uid: 'node1' }, status: { nodeInfo: { kubeletVersion: 'v1.27.3', osImage: 'Ubuntu 22.04.2 LTS' }, capacity: { cpu: '4' }, conditions: [{ type: 'Ready', status: 'True' }] } },
    { metadata: { name: 'aks-agentpool-12345678-vmss000001', uid: 'node2' }, status: { nodeInfo: { kubeletVersion: 'v1.27.3', osImage: 'Ubuntu 22.04.2 LTS' }, capacity: { cpu: '4' }, conditions: [{ type: 'Ready', status: 'True' }] } },
];

const MOCK_PODS = [
    { metadata: { name: 'nginx-deployment-7469975f58-abcde', uid: 'pod1', creationTimestamp: new Date() }, spec: { nodeName: 'aks-agentpool-12345678-vmss000000' }, status: { phase: 'Running', containerStatuses: [{ restartCount: 0 }] } },
    { metadata: { name: 'backend-api-55bf56f45d-fghij', uid: 'pod2', creationTimestamp: new Date() }, spec: { nodeName: 'aks-agentpool-12345678-vmss000000' }, status: { phase: 'Running', containerStatuses: [{ restartCount: 2 }] } },
    { metadata: { name: 'redis-master-0', uid: 'pod3', creationTimestamp: new Date() }, spec: { nodeName: 'aks-agentpool-12345678-vmss000001' }, status: { phase: 'Running', containerStatuses: [{ restartCount: 0 }] } },
    { metadata: { name: 'auth-service-98765-xyz', uid: 'pod4', creationTimestamp: new Date() }, spec: { nodeName: 'aks-agentpool-12345678-vmss000001' }, status: { phase: 'Pending', containerStatuses: [] } },
];

export default function AKSDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t } = useTranslation();
    
    const tenantId = params.tenantId as string;
    const resourceId = params.resourceId as string;
    const name = searchParams.get('name') || 'Cluster';
    const resourceGroup = searchParams.get('rg') || '';

    const [tenant, setTenant] = useState<any>(null);
    const [pods, setPods] = useState<any[]>([]);
    const [nodes, setNodes] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (tenantId) loadData();
    }, [tenantId, resourceId]);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const tenantData = await TenantAppService.getOne(tenantId);
            setTenant(tenantData);

            // Attempt to load K8s data
            try {
                const [podData, nodeData, svcData] = await Promise.all([
                    K8sAppService.getPods(tenantId, resourceGroup, name),
                    K8sAppService.getNodes(tenantId, resourceGroup, name),
                    K8sAppService.getServices(tenantId, resourceGroup, name),
                ]);
                setPods(podData);
                setNodes(nodeData);
                setServices(svcData);
            } catch (k8sErr: any) {
                console.error('K8s Error:', k8sErr);
                if (k8sErr.response?.status === 403) {
                    setError('insufficient_permissions');
                    // Fallback to mock for visualization preview
                    setPods(MOCK_PODS);
                    setNodes(MOCK_NODES);
                } else {
                    setError('connection_error');
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const breadcrumbs = [
        { label: t('menu.admin'), href: '/admin' },
        { label: tenant?.name || 'Tenant', href: `/admin/${tenantId}` },
        { label: name, href: '#' },
    ].map((item, i) => (
        <Anchor
            key={i}
            href={item.href}
            onClick={(e) => { e.preventDefault(); if (item.href !== '#') router.push(item.href); }}
            c={item.href === '#' ? 'terra' : 'dimmed'}
        >
            {item.label}
        </Anchor>
    ));

    return (
        <DashboardLayout>
            <Stack gap="xl">
                <Breadcrumbs>{breadcrumbs}</Breadcrumbs>

                <Box>
                    <Group gap="xs" mb={4}>
                        <ActionIcon variant="subtle" color="terra" onClick={() => router.push(`/admin/${tenantId}`)}>
                            <IconArrowLeft size={18} />
                        </ActionIcon>
                        <ThemeIcon size={38} radius="md" color="blue" variant="light">
                            <IconCloud size={22} />
                        </ThemeIcon>
                        <Title order={1} style={{ fontFamily: 'var(--font-outfit)', fontWeight: 800 }}>
                            {name}
                        </Title>
                        <Badge color="blue" variant="light" size="lg">AKS Cluster</Badge>
                    </Group>
                    <Text c="dimmed" ml={46}>{resourceGroup}</Text>
                </Box>

                {error === 'insufficient_permissions' && (
                    <Alert icon={<IconAlertCircle size={16} />} title="Permisos Insuficientes" color="orange" variant="light" radius="md">
                        <Text size="sm">
                            TerraFormars no tiene permisos suficientes para administrar este clúster. 
                            Se requiere el rol <b>"Azure Kubernetes Service Cluster Admin Role"</b> en el Registro de Aplicación de Azure.
                        </Text>
                    </Alert>
                )}

                <Tabs defaultValue="visual" color="terra">
                    <Tabs.List>
                        <Tabs.Tab value="visual" leftSection={<IconTopologyStar size={16} />}>Visual View</Tabs.Tab>
                        <Tabs.Tab value="pods" leftSection={<IconBox size={16} />}>Pods ({pods.length})</Tabs.Tab>
                        <Tabs.Tab value="nodes" leftSection={<IconHierarchy2 size={16} />}>Nodes ({nodes.length})</Tabs.Tab>
                        <Tabs.Tab value="services" leftSection={<IconRoute size={16} />}>Services ({services.length})</Tabs.Tab>
                        <Tabs.Tab value="terminal" leftSection={<IconTerminal2 size={16} />}>Terminal</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="visual" pt="xl">
                        <ClusterVisualizer nodes={nodes} pods={pods} loading={loading} />
                    </Tabs.Panel>

                    <Tabs.Panel value="pods" pt="xl">
                        {loading ? <Center py="xl"><Loader color="terra" /></Center> : (
                            <Card withBorder radius="md" p={0}>
                                <ScrollArea>
                                    <Table verticalSpacing="sm">
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Name</Table.Th>
                                                <Table.Th>Status</Table.Th>
                                                <Table.Th>Restarts</Table.Th>
                                                <Table.Th>Age</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {pods.map(pod => (
                                                <Table.Tr key={pod.metadata.uid}>
                                                    <Table.Td><Text fw={500}>{pod.metadata.name}</Text></Table.Td>
                                                    <Table.Td>
                                                        <Badge color={pod.status.phase === 'Running' ? 'green' : 'orange'} variant="light">
                                                            {pod.status.phase}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>{pod.status.containerStatuses?.[0]?.restartCount || 0}</Table.Td>
                                                    <Table.Td>{new Date(pod.metadata.creationTimestamp).toLocaleDateString()}</Table.Td>
                                                </Table.Tr>
                                            ))}
                                            {pods.length === 0 && !error && (
                                                <Table.Tr><Table.Td colSpan={4} align="center"><Text c="dimmed">No pods found</Text></Table.Td></Table.Tr>
                                            )}
                                        </Table.Tbody>
                                    </Table>
                                </ScrollArea>
                            </Card>
                        )}
                    </Tabs.Panel>

                    <Tabs.Panel value="nodes" pt="xl">
                        {loading ? <Center py="xl"><Loader color="terra" /></Center> : (
                            <Card withBorder radius="md" p={0}>
                                <ScrollArea>
                                    <Table verticalSpacing="sm">
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Name</Table.Th>
                                                <Table.Th>Status</Table.Th>
                                                <Table.Th>Roles</Table.Th>
                                                <Table.Th>Version</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {nodes.map(node => (
                                                <Table.Tr key={node.metadata.uid}>
                                                    <Table.Td><Text fw={500}>{node.metadata.name}</Text></Table.Td>
                                                    <Table.Td>
                                                        <Badge color={node.status.conditions.find((c: any) => c.type === 'Ready')?.status === 'True' ? 'green' : 'red'} variant="light">
                                                            {node.status.conditions.find((c: any) => c.type === 'Ready')?.status === 'True' ? 'Ready' : 'NotReady'}
                                                        </Badge>
                                                    </Table.Td>
                                                    <Table.Td>{Object.keys(node.metadata.labels).filter(l => l.startsWith('node-role.kubernetes.io/')).map(l => l.split('/')[1]).join(', ') || 'agent'}</Table.Td>
                                                    <Table.Td>{node.status.nodeInfo.kubeletVersion}</Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </ScrollArea>
                            </Card>
                        )}
                    </Tabs.Panel>

                    <Tabs.Panel value="services" pt="xl">
                        {loading ? <Center py="xl"><Loader color="terra" /></Center> : (
                            <Card withBorder radius="md" p={0}>
                                <ScrollArea>
                                    <Table verticalSpacing="sm">
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Name</Table.Th>
                                                <Table.Th>Type</Table.Th>
                                                <Table.Th>Cluster IP</Table.Th>
                                                <Table.Th>External IP</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {services.map(svc => (
                                                <Table.Tr key={svc.metadata.uid}>
                                                    <Table.Td><Text fw={500}>{svc.metadata.name}</Text></Table.Td>
                                                    <Table.Td><Badge variant="outline">{svc.spec.type}</Badge></Table.Td>
                                                    <Table.Td>{svc.spec.clusterIP}</Table.Td>
                                                    <Table.Td>{svc.status.loadBalancer?.ingress?.[0]?.ip || '-'}</Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </ScrollArea>
                            </Card>
                        )}
                    </Tabs.Panel>

                    <Tabs.Panel value="terminal" pt="xl">
                         <Card withBorder radius="md" p="xl" bg="dark.7">
                            <Stack align="center" gap="md" py={50}>
                                <ThemeIcon size={60} radius="xl" color="blue" variant="light">
                                    <IconTerminal2 size={34} />
                                </ThemeIcon>
                                <Title order={3} c="white">Kubectl Terminal</Title>
                                <Text c="dimmed" ta="center">La terminal interactiva estará disponible próximamente en esta fase de implementación.</Text>
                            </Stack>
                         </Card>
                    </Tabs.Panel>
                </Tabs>
            </Stack>
        </DashboardLayout>
    );
}
