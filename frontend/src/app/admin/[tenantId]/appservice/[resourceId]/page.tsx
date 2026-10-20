'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/DashboardLayout';
import {
    Title, Text, Stack, Box, Group, ThemeIcon,
    Loader, Tabs, Breadcrumbs, Anchor, ActionIcon,
    Alert, Card, Badge, TextInput, Button, Code, ScrollArea,
} from '@mantine/core';
import {
    IconBuildingFactory2, IconArrowLeft, IconAlertCircle,
    IconTerminal2, IconActivity, IconInfoCircle, IconSend
} from '@tabler/icons-react';
import { TenantAppService, AppServiceAppService } from '@/services/api';
import { useTranslation } from 'react-i18next';

export default function AppServiceDetailPage() {
    const params = useParams();
    const searchParams = useSearchParams();
    const router = useRouter();
    const { t } = useTranslation();
    
    const tenantId = params.tenantId as string;
    const resourceId = params.resourceId as string;
    const name = searchParams.get('name') || 'App Service';
    const resourceGroup = searchParams.get('rg') || '';

    const [tenant, setTenant] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [command, setCommand] = useState('');
    const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
    const [executing, setExecuting] = useState(false);
    const [currentDir, setCurrentDir] = useState<string>('');
    const viewport = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (tenantId) loadData();
    }, [tenantId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const tenantData = await TenantAppService.getOne(tenantId);
            setTenant(tenantData);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleExecute = async () => {
        const trimmedCmd = command.trim();
        if (!trimmedCmd) return;
        
        setExecuting(true);
        // Use a functional update or a local variable to ensure we use the 'current' currentDir for output
        const promptPath = currentDir || '~';
        setTerminalOutput(prev => [...prev, `${promptPath} > ${trimmedCmd}`]);

        // Special handling for 'cd' to keep track of directory (best effort)
        if (trimmedCmd.startsWith('cd ')) {
            const target = trimmedCmd.substring(3).trim();
            let newDir = currentDir;

            if (target === '..' || target === '../') {
                const parts = currentDir.split('/').filter(p => p);
                parts.pop();
                newDir = parts.join('/');
            } else if (target === '/' || target === '~') {
                newDir = '';
            } else if (target.startsWith('/')) {
                // Absolute path (relative to /home in Kudu Linux)
                // We strip the leading / because Kudu 'dir' param is relative to site root or uses absolute /home/...
                newDir = target.substring(1); 
            } else {
                // Relative path
                newDir = currentDir ? `${currentDir}/${target}` : target;
            }
            
            // Clean up path (remove double slashes, etc.)
            newDir = newDir.replace(/\/+/g, '/').replace(/\/$/, '');
            
            setCurrentDir(newDir);
            setExecuting(false);
            setCommand('');
            setTerminalOutput(prev => [...prev, `Path changed to: ${newDir || '/'}`]);
            return;
        }

        try {
            const result = await AppServiceAppService.executeCommand(tenantId, resourceGroup, name, trimmedCmd, currentDir);
            setTerminalOutput(prev => [...prev, result.Output || result.Error || 'Success']);
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.message;
            setTerminalOutput(prev => [...prev, `Error: ${errorMsg}`]);
        } finally {
            setExecuting(false);
            setCommand('');
            setTimeout(() => viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: 'smooth' }), 100);
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
                        <ThemeIcon size={38} radius="md" color="pink" variant="light">
                            <IconBuildingFactory2 size={22} />
                        </ThemeIcon>
                        <Title order={1} style={{ fontFamily: 'var(--font-outfit)', fontWeight: 800 }}>
                            {name}
                        </Title>
                        <Badge color="pink" variant="light" size="lg">App Service</Badge>
                    </Group>
                    <Text c="dimmed" ml={46}>{resourceGroup}</Text>
                </Box>

                <Tabs defaultValue="terminal" color="terra">
                    <Tabs.List>
                        <Tabs.Tab value="terminal" leftSection={<IconTerminal2 size={16} />}>Terminal (Kudu)</Tabs.Tab>
                        <Tabs.Tab value="logs" leftSection={<IconActivity size={16} />}>Log Stream</Tabs.Tab>
                        <Tabs.Tab value="info" leftSection={<IconInfoCircle size={16} />}>Config</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="terminal" pt="xl">
                        <Card withBorder radius="md" p="md" bg="dark.7">
                            <Group gap="xs" mb="xs">
                                <Badge variant="filled" color="dark" size="sm" radius="sm">
                                    <Text size="xs" span ff="monospace" c="dimmed">PWD: </Text>
                                    <Text size="xs" span ff="monospace" c="terra">{currentDir || '/home'}</Text>
                                </Badge>
                                {currentDir && (
                                    <ActionIcon variant="subtle" size="sm" color="gray" onClick={() => setCurrentDir('')}>
                                        <Text size="xs">reset</Text>
                                    </ActionIcon>
                                )}
                            </Group>

                            <ScrollArea h={400} offsetScrollbars viewportRef={viewport} mb="md">
                                <Stack gap={2}>
                                    {terminalOutput.map((line, i) => (
                                        <Code key={i} block bg="transparent" c={line.includes(' > ') ? 'terra' : 'gray.3'} style={{ whiteSpace: 'pre-wrap' }}>
                                            {line}
                                        </Code>
                                    ))}
                                    {executing && <Loader size="xs" color="terra" variant="dots" />}
                                </Stack>
                            </ScrollArea>
                            
                            <Group gap="xs">
                                <TextInput
                                    placeholder="Enter command (e.g. ls, env, uptime)..."
                                    style={{ flex: 1 }}
                                    value={command}
                                    onChange={(e) => setCommand(e.currentTarget.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
                                    disabled={executing}
                                    styles={{ input: { backgroundColor: '#1A1B1E', border: '1px solid #373A40', color: 'white', fontFamily: 'monospace' } }}
                                />
                                <Button 
                                    color="terra" 
                                    onClick={handleExecute} 
                                    loading={executing}
                                    leftSection={<IconSend size={16} />}
                                >
                                    Execute
                                </Button>
                            </Group>
                        </Card>
                    </Tabs.Panel>

                    <Tabs.Panel value="logs" pt="xl">
                        <Alert icon={<IconAlertCircle size={16} />} title="Log Stream Info" color="blue" variant="light" radius="md">
                            <Text size="sm">
                                El stream de logs en tiempo real utiliza la API de Kudu. Para una mejor experiencia, 
                                se recomienda habilitar "Application Logging" en el Portal de Azure.
                            </Text>
                            <Button variant="outline" mt="md" size="xs" color="blue" 
                                onClick={() => window.open(`https://${name}.scm.azurewebsites.net/api/logstream`, '_blank')}
                            >
                                Open Real-time Log Stream
                            </Button>
                        </Alert>
                    </Tabs.Panel>

                    <Tabs.Panel value="info" pt="xl">
                        <Card withBorder radius="md">
                            <Text size="sm" fw={700} mb="xs">App Service Details</Text>
                            <Group gap="xl">
                                <Stack gap={2}>
                                    <Text size="xs" c="dimmed">SCM URL</Text>
                                    <Text size="sm">{`https://${name}.scm.azurewebsites.net`}</Text>
                                </Stack>
                                <Stack gap={2}>
                                    <Text size="xs" c="dimmed">Resource Group</Text>
                                    <Text size="sm">{resourceGroup}</Text>
                                </Stack>
                            </Group>
                        </Card>
                    </Tabs.Panel>
                </Tabs>
            </Stack>
        </DashboardLayout>
    );
}
