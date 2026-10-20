import { Card, Text, Group, Stack, Badge, ThemeIcon, Box, SimpleGrid, Tooltip, rem, RingProgress, Title } from '@mantine/core';
import { IconServer, IconBox, IconCpu } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

interface ClusterVisualizerProps {
    nodes: any[];
    pods: any[];
    loading?: boolean;
}

export function ClusterVisualizer({ nodes, pods, loading }: ClusterVisualizerProps) {
    const { t } = useTranslation();

    if (loading) return null;

    // Helper to group pods by node
    const podsByNode = nodes.reduce((acc, node) => {
        const nodeName = node.metadata.name;
        acc[nodeName] = pods.filter(pod => pod.spec.nodeName === nodeName);
        return acc;
    }, {} as Record<string, any[]>);

    return (
        <Stack gap="xl">
            {/* Cluster Summary Header */}
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
                <Card withBorder radius="md" p="md" className="glass-card">
                    <Group justify="space-between">
                        <Stack gap={0}>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Total Nodes</Text>
                            <Text size="xl" fw={800}>{nodes.length}</Text>
                        </Stack>
                        <ThemeIcon color="blue" variant="light" size={42} radius="md">
                            <IconServer size={24} />
                        </ThemeIcon>
                    </Group>
                    <RingProgress
                        size={80}
                        roundCaps
                        thickness={8}
                        sections={[{ value: 100, color: 'blue' }]}
                        label={<Center><IconServer size={20} color="blue" /></Center>}
                    />
                </Card>

                <Card withBorder radius="md" p="md" className="glass-card">
                    <Group justify="space-between">
                        <Stack gap={0}>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">Running Pods</Text>
                            <Text size="xl" fw={800}>{pods.filter(p => p.status.phase === 'Running').length}</Text>
                        </Stack>
                        <ThemeIcon color="green" variant="light" size={42} radius="md">
                            <IconBox size={24} />
                        </ThemeIcon>
                    </Group>
                    <RingProgress
                        size={80}
                        roundCaps
                        thickness={8}
                        sections={[
                            { value: (pods.filter(p => p.status.phase === 'Running').length / (pods.length || 1)) * 100, color: 'green' },
                            { value: (pods.filter(p => p.status.phase !== 'Running').length / (pods.length || 1)) * 100, color: 'orange' }
                        ]}
                        label={<Center><IconBox size={20} color="green" /></Center>}
                    />
                </Card>

                <Card withBorder radius="md" p="md" className="glass-card">
                    <Group justify="space-between">
                        <Stack gap={0}>
                            <Text size="xs" c="dimmed" fw={700} tt="uppercase">System Version</Text>
                            <Text size="lg" fw={800} truncate>{nodes[0]?.status?.nodeInfo?.kubeletVersion || 'v1.27.x'}</Text>
                        </Stack>
                        <ThemeIcon color="jhamf" variant="light" size={42} radius="md">
                            <IconCpu size={24} />
                        </ThemeIcon>
                    </Group>
                </Card>
            </SimpleGrid>

            {/* Visual Topology Map */}
            <Title order={3} mb="md">Cluster Topology Map</Title>
            <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
                {nodes.map(node => (
                    <Card 
                        key={node.metadata.name} 
                        withBorder 
                        radius="lg" 
                        p="xl" 
                        className="node-container"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderLeft: '4px solid var(--mantine-color-blue-6)',
                            position: 'relative',
                            overflow: 'visible'
                        }}
                    >
                        <Group justify="space-between" mb="xl">
                            <Stack gap={0}>
                                <Text fw={700} size="lg">{node.metadata.name}</Text>
                                <Group gap={4}>
                                    <Badge size="xs" color="gray" variant="dot">
                                        {node.status.nodeInfo.osImage}
                                    </Badge>
                                    <Badge size="xs" color="blue" variant="outline">
                                        {node.status.capacity.cpu} vCPUs
                                    </Badge>
                                </Group>
                            </Stack>
                            <ThemeIcon size="xl" radius="md" color="blue" variant="filled">
                                <IconServer size={22} />
                            </ThemeIcon>
                        </Group>

                        <Text size="sm" fw={600} mb="sm" c="dimmed">Resident Pods ({podsByNode[node.metadata.name]?.length || 0})</Text>
                        
                        <Group gap="sm" wrap="wrap">
                            {(podsByNode[node.metadata.name] || []).map((pod: any) => (
                                <Tooltip 
                                    key={pod.metadata.uid} 
                                    label={`${pod.metadata.name} (${pod.status.phase})`}
                                    withArrow
                                >
                                    <Box 
                                        style={{ 
                                            padding: rem(8), 
                                            borderRadius: rem(10),
                                            background: pod.status.phase === 'Running' ? 'rgba(64, 192, 87, 0.15)' : 'rgba(255, 146, 43, 0.15)',
                                            border: `1px solid ${pod.status.phase === 'Running' ? '#40c057' : '#ff922b'}`,
                                            cursor: 'help',
                                            transition: 'transform 0.2s'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                    >
                                        <IconBox 
                                            size={20} 
                                            color={pod.status.phase === 'Running' ? '#40c057' : '#ff922b'} 
                                            className={pod.status.phase === 'Running' ? 'pulse-icon' : ''}
                                        />
                                    </Box>
                                </Tooltip>
                            ))}
                            {podsByNode[node.metadata.name]?.length === 0 && (
                                <Text size="xs" c="dimmed" fs="italic">No active pods here.</Text>
                            )}
                        </Group>

                        <style jsx global>{`
                            .pulse-icon {
                                animation: pulse 2s infinite;
                            }
                            @keyframes pulse {
                                0% { opacity: 1; transform: scale(1); }
                                50% { opacity: 0.7; transform: scale(0.9); }
                                100% { opacity: 1; transform: scale(1); }
                            }
                            .node-container:hover {
                                shadow: var(--mantine-shadow-md);
                                transform: translateY(-2px);
                                transition: all 0.2s ease;
                            }
                        `}</style>
                    </Card>
                ))}
            </SimpleGrid>
        </Stack>
    );
}

// Internal Center helper for RingProgress labels
function Center({ children }: { children: React.ReactNode }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            {children}
        </div>
    );
}

