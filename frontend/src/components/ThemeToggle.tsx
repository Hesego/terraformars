'use client';

import { useEffect, useState } from 'react';
import { ActionIcon, useMantineColorScheme, useComputedColorScheme } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';

export function ThemeToggle() {
    const { setColorScheme } = useMantineColorScheme();
    const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <ActionIcon
            onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
            variant="default"
            size="lg"
            aria-label="Toggle color scheme"
        >
            {!mounted ? (
                <IconMoon stroke={1.5} size={20} />
            ) : computedColorScheme === 'light' ? (
                <IconMoon stroke={1.5} size={20} />
            ) : (
                <IconSun stroke={1.5} size={20} />
            )}
        </ActionIcon>
    );
}
