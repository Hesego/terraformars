'use client';

import { useState, useEffect } from 'react';
import {
    Stack, Select, Button, Box, Text, Group, Code, Badge, ScrollArea, Paper,
    Loader, Alert,
} from '@mantine/core';
import { IconTerminal2, IconPlayerStop, IconAlertTriangle } from '@tabler/icons-react';
import { ScriptAppService, DeploymentAppService } from '@/services/api';
import { notifications } from '@mantine/notifications';

interface ScriptConsoleProps {
    tenantId: string;
    resourceId: string;
    resourceName: string;
    resourceGroup: string;
    osType: 'Linux' | 'Windows';
    deploymentId?: string | null;
}

export function ScriptConsole({ tenantId, resourceId, resourceName, resourceGroup, osType, deploymentId }: ScriptConsoleProps) {
    const [scripts, setScripts] = useState<any[]>([]);
    const [selectedScript, setSelectedScript] = useState<string | null>(null);
    const [executing, setExecuting] = useState(false);
    const [executionId, setExecutionId] = useState<string | null>(null);
    const [output, setOutput] = useState<string[]>([]);
    const [executionStatus, setExecutionStatus] = useState<string | null>(null);
    const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);

    // Import AdminAppService
    const { AdminAppService } = require('@/services/api');

    useEffect(() => {
        ScriptAppService.list().then(setScripts).catch(console.error);
        return () => { if (pollInterval) clearInterval(pollInterval); };
    }, []);

    const clearPoll = () => {
        if (pollInterval) { clearInterval(pollInterval); setPollInterval(null); }
    };

    const startPolling = (execId: string) => {
        const interval = setInterval(async () => {
            try {
                const exec = await DeploymentAppService.getScriptExecution(execId);
                const lines: string[] = [];
                if (exec.logs) lines.push(...exec.logs.split('\n').filter(Boolean));
                setOutput(lines);
                setExecutionStatus(exec.status);
                if (['success', 'failed', 'cancelled'].includes(exec.status)) {
                    clearInterval(interval);
                    setPollInterval(null);
                    setExecuting(false);
                }
            } catch (err) {
                clearInterval(interval);
                setPollInterval(null);
                setExecuting(false);
            }
        }, 2500);
        setPollInterval(interval);
    };

    const handleExecute = async () => {
        if (!selectedScript) {
            notifications.show({ message: 'Select a script first', color: 'orange' });
            return;
        }
        setExecuting(true);
        setOutput(['> Queueing execution...']);
        setExecutionStatus('pending');
        try {
            let exec;
            if (deploymentId) {
                // Deployment-based execution
                exec = await DeploymentAppService.executeScript(deploymentId, resourceId, selectedScript);
            } else {
                // Ad-hoc execution via Admin module
                exec = await AdminAppService.executeScript(tenantId, {
                    resourceId,
                    resourceName,
                    resourceGroup,
                    scriptId: selectedScript,
                    osType,
                });
            }
            setExecutionId(exec.id);
            setOutput(prev => [...prev, '> Script queued. Waiting for result...']);
            startPolling(exec.id);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.message;
            setOutput([`Error: ${errorMsg}`]);
            setExecuting(false);
        }
    };

    const handleStop = async () => {
        if (!executionId) return;
        try {
            await DeploymentAppService.stopScriptExecution(executionId);
            clearPoll();
            setOutput(prev => [...prev, '> Execution cancelled by user.']);
            setExecutionStatus('cancelled');
            setExecuting(false);
        } catch (err) {
            notifications.show({ message: 'Could not stop execution', color: 'red' });
        }
    };

    const statusColor: Record<string, string> = {
        pending: 'yellow', running: 'blue', success: 'green', failed: 'red', cancelled: 'gray',
    };

    return (
        <Stack gap="md">
            <Alert icon={<IconAlertTriangle size={16} />} color="orange" variant="light" radius="md">
                Script execution is only available for Virtual Machines via Azure RunCommand.
            </Alert>

            <Group align="flex-end" gap="xs">
                <Select
                    label="Script to execute"
                    placeholder="Select from library"
                    data={scripts.map((s) => ({ value: s.id, label: s.name }))}
                    value={selectedScript}
                    onChange={setSelectedScript}
                    disabled={executing}
                    style={{ flex: 1 }}
                />
                <Button
                    leftSection={<IconTerminal2 size={16} />}
                    color="jhamf"
                    onClick={handleExecute}
                    loading={executing}
                    disabled={!selectedScript || executing}
                >
                    Execute
                </Button>
                {executing && (
                    <Button
                        leftSection={<IconPlayerStop size={16} />}
                        color="red"
                        variant="outline"
                        onClick={handleStop}
                    >
                        Stop
                    </Button>
                )}
            </Group>

            {/* Terminal Output */}
            {(output.length > 0 || executionStatus) && (
                <Box>
                    <Group mb={6} gap="xs">
                        <Text size="xs" fw={700} tt="uppercase" c="dimmed">Output</Text>
                        {executionStatus && (
                            <Badge size="xs" color={statusColor[executionStatus] || 'gray'}>
                                {executionStatus}
                            </Badge>
                        )}
                        {executing && <Loader size="xs" color="jhamf" />}
                    </Group>
                    <ScrollArea h={240}>
                        <Paper
                            radius="md"
                            p="sm"
                            style={{
                                backgroundColor: 'var(--mantine-color-dark-9, #0d0d0d)',
                                fontFamily: 'monospace',
                                minHeight: 240,
                            }}
                        >
                            {output.map((line, i) => (
                                <Text key={i} size="xs" style={{ color: '#a9dc76', lineHeight: 1.6 }}>
                                    {line}
                                </Text>
                            ))}
                            {executing && (
                                <Text size="xs" style={{ color: '#78dce8' }}>▮</Text>
                            )}
                        </Paper>
                    </ScrollArea>
                </Box>
            )}
        </Stack>
    );
}
