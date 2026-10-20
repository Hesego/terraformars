'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { Title, Text, Stack, SimpleGrid, Card, Group, ThemeIcon, Box, Loader, Center, Badge } from '@mantine/core';
import { IconRocket, IconCode, IconCheck, IconAlertCircle, IconChartBar, IconChartDonut, IconChartPie, IconCloud } from '@tabler/icons-react';
import { useEffect, useState } from 'react';
import { DeploymentAppService } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { BarChart, DonutChart, AreaChart } from '@mantine/charts';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';

export default function HomePage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) {
      fetchStats();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchStats = async () => {
    try {
      const data = await DeploymentAppService.getStats();
      setStats(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || (loading && !stats)) return (
    <DashboardLayout>
      <Center h="70vh"><Loader color="jhamf.6" size="xl" /></Center>
    </DashboardLayout>
  );

  // Fallback if stats fail to load
  if (!stats) return (
    <DashboardLayout>
      <Center h="70vh">
        <Stack align="center" gap="sm">
          <IconAlertCircle size={48} color="var(--mantine-color-red-6)" />
          <Text fw={500}>Failed to load dashboard data. Please try refreshing.</Text>
        </Stack>
      </Center>
    </DashboardLayout>
  );

  const resourceTypes = stats?.resourceTypeStats ? Array.from(new Set(
    stats.resourceTypeStats.flatMap((s: any) => Object.keys(s).filter(k => k !== 'tenant'))
  )) as string[] : [];

  const typeConfig = resourceTypes.map((type, idx) => ({
    name: type,
    color: `jhamf.${(idx % 5) * 2 + 1}`
  }));

  return (
    <DashboardLayout>
      <Stack gap="xl">
        <Box
          py={140}

          px={{ base: 'md', sm: 50 }}
          className="terraformars-hero"
          style={{
            borderRadius: '32px',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)'
          }}
        >
          {/* Subtle glow inside welcome box */}
          <Box
            style={{
              position: 'absolute',
              top: '-50%',
              right: '-10%',
              width: '400px',
              height: '400px',
              background: 'radial-gradient(circle, rgba(25, 118, 210, 0.15) 0%, transparent 70%)',
              pointerEvents: 'none'
            }}
          />

          <Stack gap="xs">
            <Badge color="jhamf.4" variant="light" size="lg" radius="sm">v1.1 Security Hardened</Badge>
            <Title order={1} className="terraformars-title" style={{ fontSize: '3rem', fontWeight: 900, lineHeight: 1.1 }}>
              {t('dashboard.welcome')} TerraFormars
            </Title>
            <Text size="xl" className="terraformars-subtitle" style={{ maxWidth: 600, fontWeight: 500 }}>
              {t('dashboard.subtitle')}
            </Text>

          </Stack>
        </Box>

        {/* Operational Alerts Section */}
        {stats.alerts && stats.alerts.length > 0 && (
          <Box>
            <Title order={3} mb="md" c="red.4" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <IconAlertCircle size={24} /> {t('dashboard.stats.alerts.title')}
            </Title>
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
              {stats.alerts.map((alert: any, idx: number) => (
                <Card 
                  key={alert.id || idx} 
                  withBorder 
                  className="glass-card" 
                  style={{ 
                    borderLeft: `4px solid var(--mantine-color-${alert.type === 'failed' ? 'red' : 'blue'}-6)`,
                    borderRadius: '16px' 
                  }}
                >
                  <Group wrap="nowrap" align="flex-start">
                    <ThemeIcon variant="light" color={alert.type === 'failed' ? 'red' : 'blue'} p={4}>
                      {alert.type === 'failed' ? <IconAlertCircle size={18} /> : <IconChartBar size={18} />}
                    </ThemeIcon>
                    <div>
                      <Text fw={700} size="sm">{alert.title}</Text>
                      <Text size="xs" c="dimmed">{alert.message}</Text>
                      <Badge size="xs" color="jhamf.6" mt="xs">{alert.tenant}</Badge>
                    </div>
                  </Group>
                </Card>
              ))}
            </SimpleGrid>
          </Box>
        )}

        <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="lg">
          <Card withBorder style={{ borderRadius: '24px' }} p="xl" className="glass-card">
            <Group>
              <ThemeIcon size="xl" radius="md" color="green">
                <IconCheck size={24} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">{t('dashboard.stats.successful')}</Text>
                <Text fw={700} size="xl">{stats.summary.success}</Text>
              </div>
            </Group>
          </Card>

          <Card withBorder style={{ borderRadius: '24px' }} p="xl" className="glass-card">
            <Group>
              <ThemeIcon size="xl" radius="md" color="red">
                <IconAlertCircle size={24} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">{t('dashboard.stats.failed')}</Text>
                <Text fw={700} size="xl">{stats.summary.failed}</Text>
              </div>
            </Group>
          </Card>

          <Card withBorder style={{ borderRadius: '24px' }} p="xl" className="glass-card">
            <Group>
              <ThemeIcon size="xl" radius="md" color="jhamf.6">
                <IconRocket size={24} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">{t('dashboard.stats.total_ops')}</Text>
                <Text fw={700} size="xl">{stats.summary.total}</Text>
              </div>
            </Group>
          </Card>

          <Card withBorder radius="lg" p="xl" className="glass-card">
            <Group>
              <ThemeIcon size="xl" radius="md" color="teal">
                <IconCloud size={24} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">{t('dashboard.stats.tenants')}</Text>
                <Text fw={700} size="xl">{stats.summary.tenants || 0}</Text>
              </div>
            </Group>
          </Card>

          <Card withBorder radius="lg" p="xl" className="glass-card">
            <Group>
              <ThemeIcon size="xl" radius="md" color="indigo">
                <IconCode size={24} />
              </ThemeIcon>
              <div>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">{t('dashboard.stats.total_resources')}</Text>
                <Text fw={700} size="xl">{stats.summary.totalResources || 0}</Text>
              </div>
            </Group>
          </Card>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 3 }} spacing="xl">
          <Card withBorder style={{ borderRadius: '24px', gridColumn: 'span 2' }} p="xl" className="glass-card">
            <Group mb="xl">
              <ThemeIcon variant="light" color="jhamf.6" size="lg">
                <IconChartBar size={20} />
              </ThemeIcon>
              <Title order={4}>{t('dashboard.stats.weekly_trend')}</Title>
            </Group>
            <AreaChart
              h={300}
              data={stats.timeline}
              dataKey="date"
              series={[{ name: 'count', color: 'jhamf.6', label: 'Deployments' }]}
              curveType="monotone"
              tickLine="y"
              gridAxis="xy"
              withDots={true}
            />
          </Card>

          {/* Recent Activity */}
          <Card withBorder style={{ borderRadius: '24px' }} p="xl" className="glass-card">
            <Group mb="xl" justify="space-between">
              <Group>
                <ThemeIcon variant="light" color="jhamf.6" size="lg">
                  <IconRocket size={20} />
                </ThemeIcon>
                <Title order={4}>{t('dashboard.stats.recent_activity.title')}</Title>
              </Group>
              <Link href="/deployments" style={{ textDecoration: 'none' }}>
                <Text size="xs" c="jhamf.6" fw={600}>{t('dashboard.stats.recent_activity.view_all')}</Text>
              </Link>
            </Group>
            <Stack gap="sm">
              {stats.recentActivity?.map((act: any) => (
                <Box key={act.id} p="sm" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <Group justify="space-between">
                    <div>
                      <Text size="sm" fw={600}>{act.title}</Text>
                      <Text size="xs" c="dimmed">{act.tenant} • {new Date(act.date).toLocaleDateString()}</Text>
                    </div>
                    <Badge size="xs" color={act.status === 'success' ? 'green' : act.status === 'failed' ? 'red' : 'blue'} variant="light">
                      {act.status === 'success' ? t('resources.monitoring.status.success') : act.status === 'failed' ? t('resources.monitoring.status.failed') : t('resources.monitoring.status.creating')}
                    </Badge>
                  </Group>
                </Box>
              ))}
            </Stack>
          </Card>
        </SimpleGrid>

        <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="xl">
          {/* Effectiveness */}
          <Card withBorder style={{ borderRadius: '24px' }} p="xl" className="glass-card">
            <Group mb="xl">
              <ThemeIcon variant="light" color="green" size="lg">
                <IconChartDonut size={20} />
              </ThemeIcon>
              <Title order={4}>{t('dashboard.stats.success_rate')}</Title>
            </Group>
            <DonutChart
              h={250}
              data={stats.performance}
              withLabelsLine
              labelsType="percent"
              withLabels
              chartLabel="Effectiveness"
            />
          </Card>

          {/* Resources per Tenant */}
          <Card withBorder style={{ borderRadius: '24px' }} p="xl" className="glass-card">
            <Group mb="xl">
              <ThemeIcon variant="light" color="indigo" size="lg">
                <IconCode size={20} />
              </ThemeIcon>
              <Title order={4}>{t('dashboard.stats.resource_composition')}</Title>
            </Group>
            <BarChart
              h={250}
              data={stats.tenantResourceCount}
              dataKey="name"
              series={[{ name: 'count', color: 'indigo.6', label: 'Resources' }]}
              tickLine="y"
            />
          </Card>
        </SimpleGrid>

        <Title order={3}>{t('dashboard.quick_start.title')}</Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }}>
          <Card component={Link} href="/generator" withBorder p="xl" className="glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s ease', borderRadius: '24px' }} onMouseEnter={(e: any) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e: any) => e.currentTarget.style.transform = 'translateY(0)'}>
            <Group>
              <img src="/jhamfgroup.png" width={48} height={48} alt="Generator" />
              <div>
                <Text fw={700}>{t('menu.generator')}</Text>
                <Text size="sm" c="dimmed">{t('dashboard.quick_start.generator_desc')}</Text>
              </div>
            </Group>
          </Card>
          <Card component={Link} href="/tenants" withBorder p="xl" className="glass-card" style={{ cursor: 'pointer', transition: 'transform 0.2s ease', borderRadius: '24px' }} onMouseEnter={(e: any) => e.currentTarget.style.transform = 'translateY(-4px)'} onMouseLeave={(e: any) => e.currentTarget.style.transform = 'translateY(0)'}>
            <Group>
              <img src="/jhamfgroup.png" width={48} height={48} alt="Tenants" />
              <div>
                <Text fw={700}>{t('menu.tenants')}</Text>
                <Text size="sm" c="dimmed">{t('dashboard.quick_start.tenants_desc')}</Text>
              </div>
            </Group>
          </Card>
        </SimpleGrid>
      </Stack>
    </DashboardLayout>
  );
}
