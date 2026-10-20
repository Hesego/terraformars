'use client';

import { ActionIcon, Menu, Group, Text } from '@mantine/core';
import { useTranslation } from 'react-i18next';
import { IconLanguage } from '@tabler/icons-react';

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const setLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <Menu shadow="md" width={120}>
            <Menu.Target>
                <ActionIcon variant="light" color="hesego" size="lg" aria-label="Cambiar idioma">
                    <IconLanguage size="1.2rem" />
                </ActionIcon>
            </Menu.Target>

            <Menu.Dropdown>
                <Menu.Item
                    onClick={() => setLanguage('en')}
                    fw={i18n.language?.startsWith('en') ? 700 : 400}
                >
                    <Group gap="xs">
                        <Text size="sm">English</Text>
                    </Group>
                </Menu.Item>
                <Menu.Item
                    onClick={() => setLanguage('es')}
                    fw={i18n.language?.startsWith('es') ? 700 : 400}
                >
                    <Group gap="xs">
                        <Text size="sm">Español</Text>
                    </Group>
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}
