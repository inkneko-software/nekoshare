'use client';
import { Box, Tabs, Tab, Paper } from '@mui/material';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import 'dayjs/locale/zh-cn'
import { getLatestTradingDay } from '@/lib/chinese-holidays/TradingDays';
import { FocusContext } from '@/app/v2/focus/context';
function FocusLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {
    const routes = [
        { label: '概念热点', value: 'hot', href: '/v2/focus/hot' },
        { label: '涨停分析', value: 'analyze', href: '/v2/focus/analyze' },
        { label: '热点股池', value: 'stocks', href: '/v2/focus/stocks' },
    ]
    const router = useRouter();
    const pathName = usePathname();
    const [selectedTradeDate, setSelectedTradeDate] = useState(getLatestTradingDay());

    const handleChange = (event: React.SyntheticEvent, href: string) => {
        router.push(href);
    };

    
    return (
        <Paper sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }} square>
            <Box sx={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
                <Tabs value={pathName} onChange={handleChange} aria-label="focus tabs" sx={{  margin: 'auto 0px' }}>
                    {routes.map(route => (
                        <Tab key={route.value} label={route.label} value={route.href} />
                    ))}
                </Tabs>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='zh-cn'>
                    <DatePicker
                        format='YYYY-MM-DD'
                        value={dayjs(selectedTradeDate)}
                        onChange={val => val && setSelectedTradeDate(val)}
                        slotProps={{ textField: { size: 'small' } }}
                        sx={{margin: 'auto 8px auto auto' }} />
                </LocalizationProvider>
            </Box>
            <FocusContext.Provider value={{ selectedTradeDate }}>
                {children}
            </FocusContext.Provider>
        </Paper>
    );
}

export default FocusLayout;