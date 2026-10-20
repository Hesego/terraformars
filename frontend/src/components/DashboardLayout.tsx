'use client';

import { AppShell, Burger, Group, NavLink, Title, Text, Box, Badge, Anchor, Menu, Avatar, UnstyledButton, Loader, Divider, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconLayoutDashboard, IconCode, IconDatabase, IconCloudComputing, IconSettings, IconRocket, IconLogout, IconUser, IconChevronDown, IconTerminal2, IconServer, IconShieldCog } from '@tabler/icons-react';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';

import { ThemeToggle } from './ThemeToggle';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [opened, { toggle }] = useDisclosure();
    const pathname = usePathname();
    const { t } = useTranslation();
    const { user, logout, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && !user) {
            router.push('/login');
        }
    }, [user, isLoading, router]);

    const handleLogout = () => {
        logout();
        router.push('/login');
    };

    if (isLoading) {
        return <Box style={{ display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}><Loader size="xl" /></Box>;
    }

    if (!user) return null;

    const navItems = [
        { label: t('menu.dashboard'), icon: IconLayoutDashboard, href: '/' },
        { label: t('menu.generator'), icon: IconCode, href: '/generator' },
        { label: t('menu.library'), icon: IconDatabase, href: '/library' },
        { label: t('menu.deployments'), icon: IconCloudComputing, href: '/deployments' },
        { label: t('menu.resources'), icon: IconServer, href: '/resources' },
        { label: 'Scripts', icon: IconTerminal2, href: '/scripts' },
        { label: t('menu.admin'), icon: IconShieldCog, href: '/admin' },
        { label: t('menu.tenants'), icon: IconSettings, href: '/tenants' },
    ];


    return (
        <AppShell
            header={{ height: 70 }}
            footer={{ height: 56 }}
            navbar={{
                width: 280,
                breakpoint: 'sm',
                collapsed: { mobile: !opened },
            }}
            padding={{ base: 'md', sm: 'xl' }}
        >
            <AppShell.Header
                style={{
                    backgroundColor: 'transparent',
                    backdropFilter: 'blur(12px)',
                    borderBottom: '1px solid var(--mantine-color-default-border)',
                }}
            >
                <Group h="100%" px="xl" justify="space-between">
                    <Group gap="xs">
                        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                        <Group gap={2} align="center">
                            <img 
                                src="/logo.png" 
                                alt="Hesego Ingeniería Logo" 
                                style={{ 
                                    height: 'clamp(40px, 8vw, 60px)',
                                    width: 'auto',
                                    filter: 'drop-shadow(0 0 15px rgba(25, 118, 210, 0.25))',
                                    display: 'block'
                                }} 
                            />
                            <Title
                                order={1}
                                ta="center"
                                className="brand-logo-text"
                                style={{
                                    fontFamily: 'var(--font-outfit)',
                                    fontWeight: 900,
                                    fontSize: 'clamp(20px, 5vw, 34px)',
                                    letterSpacing: '-1px',
                                    lineHeight: 1,
                                }}
                            >
                                <Box component="span" visibleFrom="xs">TerraFormars</Box>
                                <Box component="span" hiddenFrom="xs">TFM</Box>
                            </Title>
                        </Group>
                    </Group>
                    <Group visibleFrom="sm">
                        <LanguageSwitcher />
                        <ThemeToggle />
                        <Menu shadow="md" width={200} position="bottom-end">
                            <Menu.Target>
                                <UnstyledButton
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        padding: '6px 10px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--mantine-color-default-border)',
                                        transition: 'background 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--mantine-color-default-hover)')}
                                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                    <Avatar
                                        size={28}
                                        radius="xl"
                                        color="hesego"
                                        variant="filled"
                                    >
                                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                                    </Avatar>
                                    <Text size="sm" fw={500}>{user?.name || 'Usuario'}</Text>
                                    <IconChevronDown size={14} />
                                </UnstyledButton>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Label>{user?.email}</Menu.Label>
                                <Menu.Item leftSection={<IconUser size={14} />} disabled>
                                    Mi perfil
                                </Menu.Item>
                                <Menu.Divider />
                                <Menu.Item
                                    color="red"
                                    leftSection={<IconLogout size={14} />}
                                    onClick={handleLogout}
                                >
                                    Cerrar sesión
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Group>
            </AppShell.Header>

            <AppShell.Navbar
                p="md"
                style={{
                    backgroundColor: 'transparent',
                    backdropFilter: 'blur(12px)',
                    borderRight: '1px solid var(--mantine-color-default-border)',
                }}
            >
                <Box mb="xl" px="sm">
                    <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts="1px">{t('common.menu_principal')}</Text>
                </Box>
                {navItems.map((item) => (
                    <NavLink
                        key={item.href}
                        component={Link}
                        href={item.href}
                        label={item.label}
                        leftSection={<item.icon size="1.2rem" stroke={1.5} />}
                        active={pathname === item.href}
                        variant="light"
                        color="hesego"
                        mb={4}
                        style={{ borderRadius: '8px', fontWeight: 500 }}
                    />
                ))}

                <Box mt="auto" hiddenFrom="sm">
                    <Divider my="md" label="Ajustes" labelPosition="center" />
                    <Stack gap="sm">
                        <Group justify="space-between" px="sm">
                            <Text size="sm" fw={500}>Idioma</Text>
                            <LanguageSwitcher />
                        </Group>
                        <Group justify="space-between" px="sm">
                            <Text size="sm" fw={500}>Modo</Text>
                            <ThemeToggle />
                        </Group>
                        <NavLink
                            label="Cerrar sesión"
                            leftSection={<IconLogout size="1.2rem" stroke={1.5} />}
                            color="red"
                            variant="light"
                            onClick={handleLogout}
                            style={{ borderRadius: '8px', fontWeight: 500 }}
                        />
                    </Stack>
                </Box>
            </AppShell.Navbar>

            <AppShell.Main>
                <Box style={{ maxWidth: 1400, margin: '0 auto', width: '100%' }}>
                    {children}
                </Box>
            </AppShell.Main>

            <AppShell.Footer
                style={{
                    borderTop: 'none',
                    backgroundColor: 'transparent',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 -1px 0 0 var(--mantine-color-default-border)',
                }}
            >
                {/* Gradient accent line */}
                <Box
                    style={{
                        height: '2px',
                        background: 'linear-gradient(90deg, transparent 0%, var(--mantine-color-hesego-filled) 40%, var(--mantine-color-hesego-light-color) 60%, transparent 100%)',
                    }}
                />

                <Group h={{ base: 'auto', sm: 54 }} py={{ base: 'md', sm: 0 }} px="xl" justify="space-between" wrap="wrap">
                    {/* Left: branding */}
                    <Group gap={2}>
                        <img src="/logo.png" alt="Logo" width={32} height={32} style={{ filter: 'drop-shadow(0 0 6px rgba(25, 118, 210, 0.2))' }} />
                        <Text
                            className="brand-logo-text"
                            size="xs"
                            fw={700}
                            style={{
                                letterSpacing: '0.3px',
                            }}
                        >
                            TerraFormars
                        </Text>
                    </Group>

                    {/* Center: copyright */}
                    <Text size="xs" c="dimmed" style={{ opacity: 0.7 }}>
                        © {new Date().getFullYear()} TerraFormars.
                    </Text>

                    {/* Right: version badge */}
                    <Badge
                        variant="dot"
                        color="hesego"
                        size="sm"
                        style={{ opacity: 0.8 }}
                    >
                        v1.0.0
                    </Badge>
                </Group>
            </AppShell.Footer>
        </AppShell>
    );
}
