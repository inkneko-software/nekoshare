'use client'
import { Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import React from 'react';

interface TradeHistory {
    stock_code: string;
    buy_date: string;
    buy_price: number;
    sell_date: string;
    sell_price: number;
    sell_reason: string;
    change_pct: number;
}

export default function VolumeBreakoutBacktestPage() {
    const [tradeDate, setTradeDate] = React.useState<Dayjs>(dayjs());
    const [results, setResults] = React.useState<TradeHistory[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);

    const handleExecute = async () => {
        setIsLoading(true);
        setResults([]);
        try {
            const dateStr = tradeDate.format('YYYYMMDD');
            const response = await fetch(`/api/pysdk/trade/getTradeResults?date=${dateStr}`);
            if (!response.ok) throw new Error('请求失败');
            const data: TradeHistory[] = await response.json();
            setResults(data);
        } catch (error) {
            console.error('回测执行失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const totalCount = results.length;
    const winCount = results.filter(r => r.change_pct > 0).length;
    const winRate = totalCount > 0 ? (winCount / totalCount * 100).toFixed(2) : '0.00';

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }} >
            <Paper sx={{ display: 'flex', padding: '16px', alignItems: 'center', gap: 2}} square>
                <Typography variant="h6" sx={{ mr: 1, whiteSpace: 'nowrap' }}>高量突破回测</Typography>
                <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="zh-cn">
                    <DatePicker
                        label="突破日期"
                        format="YYYY-MM-DD"
                        value={tradeDate}
                        onChange={val => val && setTradeDate(val)}
                        slotProps={{ textField: { size: 'small' } }}
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
                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 'bold' }}>
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
                            <TableCell sx={{ fontWeight: 'bold' }}>买入日期</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">买入价格</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>卖出日期</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">卖出价格</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }}>离场原因</TableCell>
                            <TableCell sx={{ fontWeight: 'bold' }} align="right">收益率</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {results.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                                    {isLoading ? '正在计算...' : '选择日期并点击"执行回测"查看结果'}
                                </TableCell>
                            </TableRow>
                        ) : (
                            results.map((row, index) => (
                                <TableRow key={index} hover>
                                    <TableCell>{row.stock_code}</TableCell>
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
                                            color: row.change_pct >= 0 ? 'success.main' : 'error.main',
                                            fontWeight: 'bold',
                                        }}
                                    >
                                        {(row.change_pct * 100).toFixed(2)}%
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
