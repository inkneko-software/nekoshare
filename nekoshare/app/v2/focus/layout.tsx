'use client';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
function FocusLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {
    const routes = [
        { label: '概念热点', value: 'hot', href: '/v2/focus/hot' },
        { label: '涨停分析', value: 'analyze', href: '/v2/focus/analyze' },
        { label: '热点股池', value: 'stocks', href: '/v2/focus/stocks' },
    ]
    const router = useRouter();
    const pathName = usePathname();

    const handleChange = (event: React.SyntheticEvent, href: string) => {
        router.push(href);
    };

    return (
        <Paper sx={{ padding: '16px', width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }} square>
            <Tabs value={pathName} onChange={handleChange} aria-label="focus tabs" sx={{ marginBottom: '16px' }}>
                {routes.map(route => (
                    <Tab key={route.value} label={route.label} value={route.href} />
                ))}
            </Tabs>
            <Box>
                {children}
            </Box>
        </Paper>
    );
}

export default FocusLayout;