'use client';

import { MantineProvider, createTheme } from '@mantine/core';
import '@mantine/core/styles.css';
import '@mantine/code-highlight/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import '../i18n';
import { AuthProvider } from '@/context/AuthContext';

const theme = createTheme({
    primaryColor: 'hesego',
    colors: {
        hesego: [
            '#f0f7ff',
            '#e0efff',
            '#badaff',
            '#7cc2ff',
            '#42a5f5',
            '#2196f3',
            '#1976d2',
            '#1565c0',
            '#0d47a1',
            '#0a2f6b',
        ],
    },
    fontFamily: 'var(--font-inter), sans-serif',
    headings: {
        fontFamily: 'var(--font-outfit), sans-serif',
        fontWeight: '700',
    },
});

export default function Providers({ children }: { children: React.ReactNode }) {
    return (
        <MantineProvider theme={theme} defaultColorScheme="dark">
            <AuthProvider>
                <Notifications position="top-right" />
                <ModalsProvider>
                    {children}
                </ModalsProvider>
            </AuthProvider>
        </MantineProvider>
    );
}
