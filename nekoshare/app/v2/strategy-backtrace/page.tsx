'use client'
import { Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Typography, TableSortLabel } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import React from 'react';
import { isTradingDay, getLatestTradingDay } from'@/lib/chinese-holidays/TradingDays';
import 'dayjs/locale/zh-cn'

interface TradeHistory {
    stock_code: string;
    stock_name: string;
    buy_date: string;
    buy_price: number;
    sell_date: string;
    sell_price: number;
    sell_reason: string;
    change_pct: number;
}

type SortDir = 'asc' | 'desc';

export default function VolumeBreakoutBacktestPage() {
    const [tradeDate, setTradeDate] = React.useState<Dayjs>(dayjs(getLatestTradingDay()));
    const [results, setResults] = React.useState<TradeHistory[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [sortDir, setSortDir] = React.useState<SortDir | null>(null);

    const [conceptMap, setConceptMap] = React.useState<Record<string, string>>({});

    const handleExecute = async () => {
        setIsLoading(true);
        setResults([]);
        setSortDir(null);
        setConceptMap({});
        try {
            const dateStr = tradeDate.format('YYYYMMDD');
            const response = await fetch(`/api/pysdk/trade/getTradeResults?date=${dateStr}`);
            if (!response.ok) throw new Error('请求失败');
            const data: TradeHistory[] = await response.json();
            setResults(data);

            // 批量获取概念
            const stockCodes = [...new Set(data.map(r => r.stock_code))];
            const map: Record<string, string> = {};
            await Promise.all(stockCodes.map(async (code) => {
                try {
                    const res = await fetch(`/api/pysdk/focus/get_stock_concept?stock_code=${code}`);
                    if (res.ok) {
                        const concepts: { concept_name: string }[] = await res.json();
                        map[code] = concepts.slice(0, 3).map(c => c.concept_name).join('+');
                    }
                } catch { }
            }));
            setConceptMap(map);
        } catch (error) {
            console.error('回测执行失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSortToggle = () => {
        setSortDir(prev => prev === 'desc' ? 'asc' : 'desc');
    };

    const sortedResults = React.useMemo(() => {
        if (sortDir === null) return results;
        return [...results].sort((a, b) =>
            sortDir === 'asc' ? a.change_pct - b.change_pct : b.change_pct - a.change_pct
        );
    }, [results, sortDir]);

    const totalCount = results.length;
    const winCount = results.filter(r => r.change_pct > 0).length;
    const winRate = totalCount > 0 ? (winCount / totalCount * 100).toFixed(2) : '0.00';

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
            <Paper sx={{ display: 'flex', padding: '16px', alignItems: 'center', gap: 2 }} square>
                <Typography variant="h6" sx={{ mr: 1, whiteSpace: 'nowrap' }}>高量突破回测</Typography>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="zh-cn">
                    <DatePicker
                        label="突破日期"
                        format="YYYY-MM-DD"
                        value={tradeDate}
                        onChange={val => val && setTradeDate(val)}
                        slotProps={{ textField: { size: 'small' } }}
                        shouldDisableDate={(date) => !isTradingDay(date) || date.isAfter(getLatestTradingDay())}
                    />
                </LocalizationProvider>
                <Button variant="outlined" onClick={handleExecute} disabled={isLoading}>
                    {isLoading ? '执行中...' : '执行回测'}
                </Button>
                {totalCount > 0 && (
                    <>
                        <Typography variant="body2" color="text.secondary">
                            共 {totalCount} 只
                        </Typography>
                        <Typography variant="body2" color="error.main" sx={{ fontWeight: 'bold' }}>
                            胜率 {winRate}%
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            ({winCount}/{totalCount})
                        </Typography>
                    </>
                )}
            </Paper>

            <TableContainer component={Paper} sx={{ flex: 1 }} square>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>股票代码</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>股票名称</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>概念</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>买入日期</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">买入价格</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>卖出日期</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">卖出价格</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>离场原因</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">
                                <TableSortLabel
                                    active={sortDir !== null}
                                    direction={sortDir ?? 'desc'}
                                    onClick={handleSortToggle}
                                >
                                    收益率
                                </TableSortLabel>
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedResults.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    {isLoading ? '正在计算...' : '选择日期并点击"执行回测"查看结果'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            sortedResults.map((row, index) => (
                                <TableRow key={index} hover>
                                    <TableCell>{row.stock_code}</TableCell>
                                    <TableCell>{row.stock_name}</TableCell>
                                    <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {conceptMap[row.stock_code] || '-'}
                                    </TableCell>
                                    <TableCell>{row.buy_date}</TableCell>
                                    <TableCell align="right">{row.buy_price.toFixed(2)}</TableCell>
                                    <TableCell>{row.sell_date}</TableCell>
                                    <TableCell align="right">{row.sell_price.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={row.sell_reason}
                                            size="small"
                                            color={row.sell_reason === '跌停' ? 'error' : row.sell_reason === '跌破5日线' ? 'warning' : 'default'}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell
                                        align="right"
                                        sx={{
                                            color: row.change_pct >= 0 ? 'error.main' : 'success.main',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {row.change_pct >= 0 ? '+' : ''}{(row.change_pct * 100).toFixed(2)}%
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
