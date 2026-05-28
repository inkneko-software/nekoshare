'use client';
import { Box, Tabs, Tab, Paper, Button } from '@mui/material';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn'
import { getLatestTradingDay, getPrevTradingDay } from '@/lib/chinese-holidays/TradingDays';
import { FocusContext } from '@/app/v2/focus/context';
import { isTradingDay } from "@/lib/chinese-holidays/TradingDays";
function FocusLayout({ children, }: Readonly<{ children: React.ReactNode; }>) {
    const routes = [
        { label: '概念热点', value: 'hot', href: '/v2/focus/hot' },
        { label: '涨停分析', value: 'analyze', href: '/v2/focus/analyze' },
        { label: '热点股池', value: 'stocks', href: '/v2/focus/stocks' },
    ]
    const router = useRouter();
    const pathName = usePathname();
    const [selectedTradeDate, setSelectedTradeDate] = useState(getLatestTradingDay().isSame(dayjs(), 'day') && (new Date()).getHours() < 16 ? getPrevTradingDay(getLatestTradingDay()) : getLatestTradingDay());
    const [copyTableData, setCopyTableData] = useState<(() => void) | undefined>();
    const handleChange = (event: React.SyntheticEvent, href: string) => {
        router.push(href);
    };


    return (
        <Paper sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }} square>
            <Box sx={{ display: 'flex', borderBottom: '1px solid #e0e0e0' }}>
                <Tabs value={pathName} onChange={handleChange} aria-label="focus tabs" sx={{ margin: 'auto auto auto 0px' }}>
                    {routes.map(route => (
                        <Tab key={route.value} label={route.label} value={route.href} />
                    ))}
                </Tabs>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='zh-cn'>
                    {copyTableData && (
                        <Button size="small" variant="outlined" onClick={copyTableData} sx={{  mr: 1, my: 'auto', whiteSpace: 'nowrap' }}>
                            导出至剪切板
                        </Button>
                    )}
                    <DatePicker
                        format='YYYY-MM-DD'
                        value={dayjs(selectedTradeDate)}
                        onChange={val => val && setSelectedTradeDate(val)}
                        slotProps={{ textField: { size: 'small' } }}
                        sx={{ margin: 'auto 8px auto 0px' }}
                        shouldDisableDate={(date) => !isTradingDay(date) || date.isAfter(getLatestTradingDay())}
                    />
                </LocalizationProvider>
            </Box>
            <FocusContext.Provider value={{ selectedTradeDate, copyTableData, setCopyTableData }}>
                {children}
            </FocusContext.Provider>
        </Paper>
    );
}

export default FocusLayout;