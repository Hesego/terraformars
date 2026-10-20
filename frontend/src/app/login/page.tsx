'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    Box,
    Button,
    Card,
    Center,
    Group,
    PasswordInput,
    Stack,
    Text,
    TextInput,
    Title,
    Alert,
    Divider,
    Badge,
    Loader,
} from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconRocket, IconLock, IconMail, IconAlertCircle, IconShieldCheck } from '@tabler/icons-react';
import { useAuth } from '@/context/AuthContext';

function LoginForm() {
    const { login } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const form = useForm({
        initialValues: { email: '', password: '' },
        validate: {
            email: (v) => (/^\S+@\S+$/.test(v) ? null : 'Email inválido'),
            password: (v) => (v.length >= 6 ? null : 'Mínimo 6 caracteres'),
        },
    });

    const handleSubmit = async (values: { email: string; password: string }) => {
        setLoading(true);
        setError(null);
        try {
            await login(values.email, values.password);
            const redirect = searchParams.get('redirect') || '/';
            router.push(redirect);
        } catch {
            setError('Credenciales incorrectas. Verifica tu email y contraseña.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            style={{
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #0a1128 0%, #050a1b 50%, #020408 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Ambient glow blobs in blue tones */}
            <Box
                style={{
                    position: 'absolute',
                    top: '-15%',
                    right: '-10%',
                    width: '600px',
                    height: '600px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(25, 118, 210, 0.1) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }}
            />
            <Box
                style={{
                    position: 'absolute',
                    bottom: '-20%',
                    left: '-10%',
                    width: '500px',
                    height: '500px',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(25, 118, 210, 0.08) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }}
            />

            <Center style={{ width: '100%', padding: '24px' }}>
                <Stack gap="xl" style={{ width: '100%', maxWidth: '420px' }}>
                    {/* Logo */}
                    <Stack gap="md" align="center">
                        <Box
                            style={{
                                width: '150px',
                                height: '150px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                    filter: 'drop-shadow(0 0 20px rgba(25, 118, 210, 0.3))',
                            }}
                        >
                            <img src="/logo.png" alt="Hesego Ingeniería Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </Box>
                        <Title
                            order={1}
                            ta="center"
                            className="brand-logo-text"
                            c="white"
                            style={{
                                fontFamily: 'var(--font-outfit)',
                                fontWeight: 900,
                                fontSize: '2.5rem',
                                letterSpacing: '-1px',
                                color: '#ffffff'
                            }}
                        >
                            TerraFormars
                        </Title>
                        <Text size="sm" c="dimmed" ta="center">
                            Plataforma de infraestructura inteligente con IA
                        </Text>
                    </Stack>

                    {/* Card */}
                    <Card
                        p="xl"
                        radius="32px"
                        style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid rgba(51, 109, 255, 0.15)',
                            backdropFilter: 'blur(20px)',
                            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
                        }}
                    >
                        <Stack gap="lg">
                            <Stack gap={4}>
                                <Title order={3} fw={700} c="white">
                                    Iniciar Sesión
                                </Title>
                                <Text size="sm" c="dimmed">
                                    Accede a tu cuenta para gestionar tus despliegues
                                </Text>
                            </Stack>

                            {error && (
                                <Alert
                                    icon={<IconAlertCircle size={16} />}
                                    color="red"
                                    variant="light"
                                    radius="md"
                                >
                                    {error}
                                </Alert>
                            )}

                            <form onSubmit={form.onSubmit(handleSubmit)}>
                                <Stack gap="md">
                                    <TextInput
                                        label="Email"
                                        placeholder="admin.pro@terraformars.dev"
                                        leftSection={<IconMail size={16} />}
                                        styles={{
                                            label: { color: 'var(--mantine-color-gray-4)', marginBottom: '6px' },
                                            input: {
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(51, 109, 255, 0.15)',
                                                color: 'white',
                                            },
                                        }}
                                        {...form.getInputProps('email')}
                                    />
                                    <PasswordInput
                                        label="Contraseña"
                                        placeholder="••••••••"
                                        leftSection={<IconLock size={16} />}
                                        styles={{
                                            label: { color: 'var(--mantine-color-gray-4)', marginBottom: '6px' },
                                            input: {
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(51, 109, 255, 0.15)',
                                                color: 'white',
                                            },
                                        }}
                                        {...form.getInputProps('password')}
                                    />

                                    <Button
                                        type="submit"
                                        fullWidth
                                        size="md"
                                        loading={loading}
                                        variant="gradient"
                                        gradient={{ from: 'hesego.6', to: 'hesego.8' }}
                                        radius="md"
                                        leftSection={<img src="/logo.png" width={24} height={24} />}
                                        mt="xs"
                                        style={{
                                            boxShadow: '0 4px 20px rgba(25, 118, 210, 0.3)',
                                        }}
                                    >
                                        Entrar
                                    </Button>
                                </Stack>
                            </form>

                        </Stack>
                    </Card>


                    {/* Footer */}
                    <Group justify="center" gap="xs">
                        <IconShieldCheck size={14} color="var(--mantine-color-gray-6)" />
                        <Text size="xs" c="dimmed">Conexión segura con JWT · TerraFormars © 2026</Text>
                    </Group>
                </Stack>
            </Center>
        </Box>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<Center h="100vh"><Loader color="hesego.6" size="xl" /></Center>}>
            <LoginForm />
        </Suspense>
    );
}
