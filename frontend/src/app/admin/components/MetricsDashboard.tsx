'use client';

import { useEffect, useRef } from 'react';
import { Box, Text, Stack, Group, Paper, Badge, Loader, Center } from '@mantine/core';
import {
    LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import { useMonitoring } from '@/hooks/useMonitoring';

interface MetricsDashboardProps {
    resource: {
        id: string;
        name: string;
        resourceGroup: string;
        type?: string;
    };
    tenantId: string;
    resourceType: 'vm';
}

function formatBytes(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const dm = 1;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function MetricsDashboard({ resource, tenantId, resourceType }: MetricsDashboardProps) {
    const { statuses, subscribeToResource, unsubscribeFromResource } = useMonitoring();
    const subscribedRef = useRef(false);

    useEffect(() => {
        if (!resource?.id || subscribedRef.current) return;
        subscribedRef.current = true;

        subscribeToResource({
            tenantId,
            resourceId: resource.id,
            resourceType: 'VirtualMachine',
            resourceName: resource.name,
            resourceGroupName: resource.resourceGroup,
        });

        return () => {
            unsubscribeFromResource(resource.id);
            subscribedRef.current = false;
        };
    }, [resource.id, tenantId]);

    const status = statuses[resource.id];
    const metrics = status?.metrics || [];
    const hasMetrics = metrics.length > 0;

    if (!status) {
        return (
            <Center py="xl">
                <Stack align="center" gap="xs">
                    <Loader size="sm" color="hesego" />
                    <Text size="sm" c="dimmed">Connecting to Azure Monitor...</Text>
                </Stack>
            </Center>
        );
    }

    const chartData = metrics.map((m: any) => ({
        time: new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cpu: parseFloat((m.cpu || 0).toFixed(1)),
        netIn: parseFloat(((m.netIn || 0) / 1024).toFixed(1)),
        netOut: parseFloat(((m.netOut || 0) / 1024).toFixed(1)),
        diskRead: parseFloat(((m.diskRead || 0) / 1024).toFixed(1)),
        diskWrite: parseFloat(((m.diskWrite || 0) / 1024).toFixed(1)),
        memAvail: m.memoryAvailable ? parseFloat((m.memoryAvailable / 1073741824).toFixed(2)) : null,
    }));

    const lastMetric = chartData[chartData.length - 1];

    const statCards = [
        { label: 'CPU', value: lastMetric ? `${lastMetric.cpu}%` : '—', color: 'terra' },
        { label: 'Net In', value: lastMetric ? `${lastMetric.netIn} KB/s` : '—', color: 'blue' },
        { label: 'Net Out', value: lastMetric ? `${lastMetric.netOut} KB/s` : '—', color: 'cyan' },
        { label: 'Mem. Available', value: lastMetric?.memAvail != null ? `${lastMetric.memAvail} GB` : '—', color: 'violet' },
    ];

    return (
        <Stack gap="md">
            {/* Stat summary chips */}
            <Group gap="xs">
                {statCards.map((s) => (
                    <Paper key={s.label} withBorder radius="md" px="md" py="xs" style={{ flex: '1 1 120px', minWidth: 100 }}>
                        <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{s.label}</Text>
                        <Text fw={800} size="lg" c={s.color}>{s.value}</Text>
                    </Paper>
                ))}
            </Group>

            {!hasMetrics && (
                <Text size="sm" c="dimmed" ta="center" py="md">
                    No metrics available yet. The VM may be stopped or metrics may take a few minutes to appear.
                </Text>
            )}

            {hasMetrics && (
                <>
                    {/* CPU Chart */}
                    <Box>
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={6}>CPU Usage (%)</Text>
                        <ResponsiveContainer width="100%" height={160}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-default-border)" />
                                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                                <RechartsTooltip formatter={(v: any) => [`${v}%`, 'CPU']} />
                                <Line type="monotone" dataKey="cpu" stroke="var(--mantine-color-terra-filled)" strokeWidth={2} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>

                    {/* Network Chart */}
                    <Box>
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={6}>Network Traffic (KB/s)</Text>
                        <ResponsiveContainer width="100%" height={140}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-default-border)" />
                                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <RechartsTooltip />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                                <Line type="monotone" dataKey="netIn" stroke="#339af0" strokeWidth={2} dot={false} name="In" />
                                <Line type="monotone" dataKey="netOut" stroke="#22b8cf" strokeWidth={2} dot={false} name="Out" />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>

                    {/* Disk I/O Chart */}
                    <Box>
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={6}>Disk Activity (KB/s)</Text>
                        <ResponsiveContainer width="100%" height={140}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--mantine-color-default-border)" />
                                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <RechartsTooltip />
                                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                                <Line type="monotone" dataKey="diskRead" stroke="#ae3ec9" strokeWidth={2} dot={false} name="Read" />
                                <Line type="monotone" dataKey="diskWrite" stroke="#e64980" strokeWidth={2} dot={false} name="Write" />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                </>
            )}
        </Stack>
    );
}
