'use client';

import { useState } from 'react';
import {
    Stack, Select, Button, Group, Text, Badge, Table, ActionIcon,
    Loader, Alert, Paper, Modal, Box,
} from '@mantine/core';
import { IconPlugConnected, IconPlugConnectedX, IconAlertCircle } from '@tabler/icons-react';
import { AdminAppService } from '@/services/api';
import { notifications } from '@mantine/notifications';
import { modals } from '@mantine/modals';

interface VNetControlsProps {
    vnets: any[];
    tenantId: string;
    onRefresh: () => void;
}

export function VNetControls({ vnets, tenantId, onRefresh }: VNetControlsProps) {
    const [vnet1Id, setVnet1Id] = useState<string | null>(null);
    const [vnet2Id, setVnet2Id] = useState<string | null>(null);
    const [connecting, setConnecting] = useState(false);
    const [disconnecting, setDisconnecting] = useState<string | null>(null);

    const vnetOptions = vnets.map(v => ({ value: v.id, label: v.name }));

    const vnet1 = vnets.find(v => v.id === vnet1Id);
    const vnet2 = vnets.find(v => v.id === vnet2Id);

    const handleConnect = () => {
        if (!vnet1 || !vnet2) return;
        modals.openConfirmModal({
            title: 'Connect Virtual Networks',
            centered: true,
            children: (
                <Text size="sm">
                    You are about to create a bidirectional peering between <strong>{vnet1.name}</strong> and <strong>{vnet2.name}</strong>.
                    Both VNets must have non-overlapping address spaces.
                </Text>
            ),
            labels: { confirm: 'Connect', cancel: 'Cancel' },
            confirmProps: { color: 'teal' },
            onConfirm: async () => {
                setConnecting(true);
                try {
                    await AdminAppService.connectVNets(tenantId, {
                        vnet1: { name: vnet1.name, resourceGroup: vnet1.resourceGroup },
                        vnet2: { id: vnet2.id, name: vnet2.name },
                    });
                    notifications.show({ title: 'Connected', message: `Peering created between ${vnet1.name} and ${vnet2.name}`, color: 'green' });
                    onRefresh();
                } catch (err: any) {
                    notifications.show({ title: 'Error', message: err.message || 'Could not connect VNets', color: 'red' });
                } finally {
                    setConnecting(false);
                }
            },
        });
    };

    const handleDisconnect = (vnet: any, peering: any) => {
        modals.openConfirmModal({
            title: 'Disconnect VNet Peering',
            centered: true,
            children: (
                <Text size="sm">
                    Remove peering <strong>{peering.name}</strong> from <strong>{vnet.name}</strong>? This will disconnect the VNets.
                </Text>
            ),
            labels: { confirm: 'Disconnect', cancel: 'Cancel' },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                setDisconnecting(peering.id);
                try {
                    await AdminAppService.disconnectVNet(tenantId, {
                        resourceGroup: vnet.resourceGroup,
                        vnetName: vnet.name,
                        peeringName: peering.name,
                    });
                    notifications.show({ title: 'Disconnected', message: `Peering ${peering.name} removed`, color: 'green' });
                    onRefresh();
                } catch (err: any) {
                    notifications.show({ title: 'Error', message: err.message || 'Could not remove peering', color: 'red' });
                } finally {
                    setDisconnecting(null);
                }
            },
        });
    };

    // Gather all active peerings across all vnets
    const allPeerings: { vnet: any; peering: any }[] = [];
    for (const vnet of vnets) {
        for (const peering of vnet.peerings || []) {
            allPeerings.push({ vnet, peering });
        }
    }

    return (
        <Stack gap="lg">
            {/* Connect section */}
            <Paper withBorder radius="md" p="md">
                <Text fw={700} mb="sm">Connect Virtual Networks</Text>
                <Group align="flex-end" gap="xs">
                    <Select
                        label="VNet 1"
                        placeholder="Select VNet"
                        data={vnetOptions.filter(o => o.value !== vnet2Id)}
                        value={vnet1Id}
                        onChange={setVnet1Id}
                        style={{ flex: 1 }}
                    />
                    <Select
                        label="VNet 2"
                        placeholder="Select VNet"
                        data={vnetOptions.filter(o => o.value !== vnet1Id)}
                        value={vnet2Id}
                        onChange={setVnet2Id}
                        style={{ flex: 1 }}
                    />
                    <Button
                        leftSection={<IconPlugConnected size={16} />}
                        color="teal"
                        onClick={handleConnect}
                        loading={connecting}
                        disabled={!vnet1Id || !vnet2Id || vnet1Id === vnet2Id}
                    >
                        Connect
                    </Button>
                </Group>
            </Paper>

            {/* Active peerings table */}
            <Box>
                <Text fw={700} mb="sm">Active Peerings</Text>
                {allPeerings.length === 0 ? (
                    <Alert icon={<IconAlertCircle size={16} />} color="gray" variant="light" radius="md">
                        No active VNet peerings found.
                    </Alert>
                ) : (
                    <Table striped highlightOnHover withTableBorder>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>VNet</Table.Th>
                                <Table.Th>Peering Name</Table.Th>
                                <Table.Th>State</Table.Th>
                                <Table.Th>Actions</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {allPeerings.map(({ vnet, peering }) => (
                                <Table.Tr key={peering.id}>
                                    <Table.Td><Text size="sm" fw={500}>{vnet.name}</Text></Table.Td>
                                    <Table.Td><Text size="sm">{peering.name}</Text></Table.Td>
                                    <Table.Td>
                                        <Badge
                                            color={peering.peeringState === 'Connected' ? 'green' : 'orange'}
                                            variant="dot"
                                            size="sm"
                                        >
                                            {peering.peeringState || 'Unknown'}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <ActionIcon
                                            color="red"
                                            variant="subtle"
                                            onClick={() => handleDisconnect(vnet, peering)}
                                            loading={disconnecting === peering.id}
                                        >
                                            <IconPlugConnectedX size={16} />
                                        </ActionIcon>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                )}
            </Box>
        </Stack>
    );
}
