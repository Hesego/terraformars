'use client';

import { Card, Group, ThemeIcon, Text, Badge, Stack, Box, Divider, Tooltip } from '@mantine/core';
import {
    IconServer, IconCloud, IconBuildingFactory2, IconNetworkOff,
    IconMapPin, IconTag, IconCpu, IconWorld, IconDatabase,
} from '@tabler/icons-react';

type ResourceType = 'vm' | 'aks' | 'appService' | 'vnet' | 'db';

interface ResourceCardProps {
    resource: any;
    resourceType: ResourceType;
    onClick?: () => void;
}

const TYPE_CONFIG: Record<ResourceType, { icon: any; color: string; label: string }> = {
    vm: { icon: IconServer, color: 'terra', label: 'Virtual Machine' },
    aks: { icon: IconCloud, color: 'blue', label: 'AKS Cluster' },
    appService: { icon: IconBuildingFactory2, color: 'violet', label: 'App Service' },
    vnet: { icon: IconNetworkOff, color: 'teal', label: 'Virtual Network' },
    db: { icon: IconDatabase, color: 'indigo', label: 'PostgreSQL Server' },
};

function getStatusColor(status: string): string {
    const s = (status || '').toLowerCase();
    if (s.includes('running') || s.includes('succeeded') || s.includes('active') || s.includes('ready')) return 'green';
    if (s.includes('stop') || s.includes('deallocat')) return 'orange';
    if (s.includes('fail') || s.includes('error')) return 'red';
    if (s.includes('creat') || s.includes('updat') || s.includes('starting')) return 'yellow';
    return 'gray';
}

function getDisplayStatus(resource: any, type: ResourceType): string {
    if (type === 'vm') return resource.powerState || resource.provisioningState || '—';
    if (type === 'aks') return resource.powerState || resource.provisioningState || '—';
    if (type === 'appService') return resource.state || '—';
    if (type === 'vnet') return resource.provisioningState || '—';
    if (type === 'db') return resource.provisioningState || 'Active'; // Usually active if listed
    return '—';
}

export function ResourceCard({ resource, resourceType, onClick }: ResourceCardProps) {
    const { icon: Icon, color, label } = TYPE_CONFIG[resourceType];
    const status = getDisplayStatus(resource, resourceType);
    const statusColor = getStatusColor(status);

    return (
        <Card
            withBorder
            radius="md"
            p="lg"
            onClick={onClick}
            style={{
                cursor: onClick ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
                borderLeft: `3px solid var(--mantine-color-${color}-filled)`,
            }}
            className="admin-resource-card"
        >
            <Group justify="space-between" mb="sm">
                <Group gap="xs">
                    <ThemeIcon size={36} radius="md" color={color} variant="light">
                        <Icon size={20} />
                    </ThemeIcon>
                    <Box>
                        <Text fw={700} size="sm" lineClamp={1}>{resource.name}</Text>
                        <Text size="xs" c="dimmed">{label}</Text>
                    </Box>
                </Group>
                <Badge color={statusColor} variant="dot" size="sm">
                    {status}
                </Badge>
            </Group>

            <Divider my="xs" />

            <Stack gap={6}>
                {resource.location && (
                    <Group gap={6} wrap="nowrap">
                        <IconMapPin size={13} color="var(--mantine-color-dimmed)" />
                        <Text size="xs" c="dimmed" lineClamp={1}>{resource.location}</Text>
                    </Group>
                )}
                {resource.resourceGroup && (
                    <Group gap={6} wrap="nowrap">
                        <IconTag size={13} color="var(--mantine-color-dimmed)" />
                        <Text size="xs" c="dimmed" lineClamp={1}>{resource.resourceGroup}</Text>
                    </Group>
                )}
                {resourceType === 'vm' && resource.vmSize && (
                    <Group gap={6} wrap="nowrap">
                        <IconCpu size={13} color="var(--mantine-color-dimmed)" />
                        <Text size="xs" c="dimmed">{resource.vmSize}</Text>
                    </Group>
                )}
                {resourceType === 'aks' && resource.kubernetesVersion && (
                    <Group gap={6} wrap="nowrap">
                        <IconCloud size={13} color="var(--mantine-color-dimmed)" />
                        <Text size="xs" c="dimmed">K8s {resource.kubernetesVersion} · {resource.nodeCount ?? 0} nodes</Text>
                    </Group>
                )}
                {resourceType === 'appService' && resource.hostNames?.length > 0 && (
                    <Tooltip label={resource.hostNames[0]} openDelay={300}>
                        <Group gap={6} wrap="nowrap">
                            <IconWorld size={13} color="var(--mantine-color-dimmed)" />
                            <Text size="xs" c="dimmed" lineClamp={1}>{resource.hostNames[0]}</Text>
                        </Group>
                    </Tooltip>
                )}
                {resourceType === 'vnet' && resource.addressSpace?.length > 0 && (
                    <Group gap={6} wrap="nowrap">
                        <IconNetworkOff size={13} color="var(--mantine-color-dimmed)" />
                        <Text size="xs" c="dimmed">{resource.addressSpace.join(', ')}</Text>
                    </Group>
                )}
            </Stack>
        </Card>
    );
}
