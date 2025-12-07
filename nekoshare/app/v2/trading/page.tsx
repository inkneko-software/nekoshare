'use client'
import CommonPriceTable from '@/components/CommonPriceTable/CommonPriceTable';
import TradeHistoryTable from '@/components/TradeHistoryTable';
import TradingViewWidget, { Candlestick, RectangleRegion } from '@/components/TradingViewWidget_v2';
import { Box, Button, FormControlLabel, FormGroup, Paper, Switch, TextField, Typography } from '@mui/material';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import React from 'react';
import { useSimulateTradingContext } from '@/lib/context/SimulateTradingContext';

interface BreakoutStrategyExecutingResult {
    type: 'stock' | 'industry';
    code: string;
    name: string;
    change_pct: number;
    result: {
        is_break_out: boolean;
        new_high_days: number;
    },
    rectangle_nearest?: {
        start_date: string
        end_date: string
        high_price: number
        low_price: number
    }
    rectangle_recent?: {
        start_date: string
        end_date: string
        high_price: number
        low_price: number
    },
    rectangle_large?: {
        start_date: string
        end_date: string
        high_price: number
        low_price: number
    }

}
export default function TradingPage() {
    const [isExecuting, setIsExecuting] = React.useState(false)
    const [results, setResults] = React.useState<BreakoutStrategyExecutingResult[]>([])
    const [candlesticks, setCandlesticks] = React.useState<Candlestick[]>([])
    const [rectangles, setRectangles] = React.useState<RectangleRegion[]>([])
    const logRef = React.useRef(null)
    const [selectedTradeDate, setSelectedTradeDate] = React.useState<Dayjs>(dayjs(new Date()));
    const [initialBalance, setInitialBalance] = React.useState(100000)
    const [selectedId, setSelectedId] = React.useState(-1)

    //SimulateTradeContext
    const { account, setAccount, isEnabled, setEnabled, isPaused, setPaused, startTradeDate, setStartTradeDate, currentTradeDate, setCurrentTradeDate, newSimulate, buy, sell, toNextTradeDate } = useSimulateTradingContext()

    React.useEffect(() => {

    }, [isEnabled, isPaused])


    React.useEffect(() => {
        setSelectedTradeDate(dayjs(startTradeDate))

    }, [startTradeDate])

    const handleExecute = () => {
        setIsExecuting(true);
        setResults([])
        setCandlesticks([])
        setRectangles([])

        const ws = new WebSocket(`ws://${"localhost:3010"}/ws`);
        let batchResults: BreakoutStrategyExecutingResult[] = []
        let batchId: NodeJS.Timeout | null = null
        ws.onopen = () => {
            console.log("连接成功");
            ws.send("Hello from browser!");
            batchId = setInterval(() => {
                setResults([...batchResults]);
            }, 1000);
        };

        ws.onmessage = (event) => {
            let res = JSON.parse(event.data as string) as BreakoutStrategyExecutingResult;
            if (res.type === 'industry') {
                res.name = res.name + ' -【板块】'
            } else {
                res.name = res.code + ' ' + res.name
            }
            batchResults.push(res)
        };

        ws.onclose = () => {
            setIsExecuting(false)
            if (batchId !== null) {
                setResults(batchResults);
                clearInterval(batchId)
                batchId = null
            }
        }
    }

    const handleSelectChange = (newSelectedId: number) => {
        if (selectedId === newSelectedId) {
            newSelectedId = -1;
        }

        setSelectedId(newSelectedId)

        if (newSelectedId === -1) {
            return;
        }

        async function fetchStockDayPrice() {
            try {
                console.log(account.history, newSelectedId)
                let stockCode = account.history[newSelectedId].code;
                let response = await fetch('/api/pysdk/stock/getStockDayPrice?code=' + stockCode);
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                let data = await response.json();
                //转换数据格式
                const formatter = new Intl.DateTimeFormat('en-CA')
                const candlestickData: Candlestick[] = data.data.map((item: any) => ({
                    time: item.trade_date,
                    open: item.open,
                    high: item.high,
                    low: item.low,
                    close: item.close,
                    volume: item.volume
                }));
                setCandlesticks(candlestickData);
                let tmp: RectangleRegion[] = []
                setRectangles(tmp)
            } catch (exception) {
                console.log(exception)
            }
        }
        async function fetchIndustryDayPrice() {
            try {
                let code = results[newSelectedId].code;
                let response = await fetch('/api/pysdk/ths/getIndustryDayPrice?code=' + code);
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                let data = await response.json();
                //转换数据格式
                const formatter = new Intl.DateTimeFormat('en-CA')
                const candlestickData: Candlestick[] = data.data.map((item: any) => ({
                    time: item.trade_date,
                    open: item.open,
                    high: item.high,
                    low: item.low,
                    close: item.close,
                    volume: item.volume
                }));
                setCandlesticks(candlestickData);
                let tmp: RectangleRegion[] = []
                let selectedResult = results[newSelectedId]
                if (selectedResult.rectangle_nearest !== undefined) {
                    let rect = selectedResult.rectangle_nearest
                    tmp.push({
                        pointA: { time: rect.start_date, price: rect.low_price },
                        pointB: { time: rect.end_date, price: rect.high_price }
                    })
                }
                if (selectedResult.rectangle_recent !== undefined) {
                    let rect = selectedResult.rectangle_recent
                    console.log(rect, rect.start_date)
                    tmp.push({
                        pointA: { time: rect.start_date, price: rect.low_price },
                        pointB: { time: rect.end_date, price: rect.high_price }
                    })
                }
                if (selectedResult.rectangle_large !== undefined) {
                    let rect = selectedResult.rectangle_large
                    tmp.push({
                        pointA: { time: rect.start_date, price: rect.low_price },
                        pointB: { time: rect.end_date, price: rect.high_price }
                    })
                }
                console.log(tmp)
                setRectangles(tmp)
            } catch (exception) {
                console.log(exception)
            }
        }
        fetchStockDayPrice()
    }

    const handleSwitchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        console.log(isEnabled)
        if (!isEnabled) {
            if (!isPaused) {
                newSimulate(selectedTradeDate.format("YYYY-MM-DD"), initialBalance)
            }
            setEnabled(true)
            setPaused(false)
            
        } else {
            setEnabled(false)
            setPaused(true)
        }
    };

    const handleResetSimulateTrade = ()=>{
        setEnabled(false)
        setPaused(false)
    }
    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex' }}>
            <Paper sx={{ width: '40%', display: 'flex', flexDirection: 'column' }} square>
                <Box sx={{ display: 'flex', margin: '8px 8px', paddingTop: '8px' }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='zh-cn'>
                        <DatePicker
                            label="开始日期"
                            format='YYYY-MM-DD'
                            disabled={isEnabled || isPaused}
                            value={dayjs(selectedTradeDate)}
                            onChange={val => val && setSelectedTradeDate(val)}
                            slotProps={{ textField: { size: 'small' } }}
                            sx={{ marginRight: '8px', width: '30%' }} />
                    </LocalizationProvider>
                    <TextField size='small' type='number' disabled={isEnabled || isPaused} label='初始金额' value={initialBalance} onChange={(e) => setInitialBalance(parseInt(e.target.value))} sx={{ width: '30%', margin: '0px 8px' }} />
                    <FormGroup sx={{ margin: '0px 8px', width: '30%' }}>
                        <FormControlLabel control={<Switch checked={isEnabled} onChange={handleSwitchChange} />} label={isEnabled ? '模拟交易已开启' : isPaused ? '模拟交易已暂停' : '模拟交易已关闭'} />
                    </FormGroup>
                </Box>
                <Box sx={{ display: 'flex', margin: '8px 8px' }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='zh-cn'>
                        <TextField
                            label="当前日期"
                            disabled
                            value={dayjs(selectedTradeDate).format("YYYY-MM-DD")}
                            size='small'
                            sx={{ marginRight: '8px', width: '30%' }} />
                    </LocalizationProvider>
                    <TextField size='small' disabled label='当前资产' defaultValue="100000.00" sx={{ width: '30%', margin: '0px 8px' }} />
                    <Button variant='outlined' sx={{ margin: '0px 8px', width: '15%' }} size='small' onClick={handleResetSimulateTrade}>重置模拟</Button>
                    <Button variant='outlined' disabled={!isEnabled} sx={{ margin: '0px 8px', width: '15%' }} size='small' onClick={handleResetSimulateTrade}>下一日</Button>
                </Box>
                <Box sx={{ display: 'flex', padding: '8px 8px' }}>
                    <Typography variant='body2' sx={{ width: '60%', margin: '0px 8px' }}>总收益率 5%</Typography>
                </Box>
                <TradeHistoryTable
                    selectedId={selectedId}
                    onSelectedChange={handleSelectChange}
                    rows={account.history} />
            </Paper>
            <Paper sx={{ width: '60%', borderLeft: '1px #505a5e solid', display: 'flex', flexDirection: 'column' }} square>
                <Box sx={{ height: '70%' }}>
                    <TradingViewWidget candlesticks={candlesticks} rectangles={rectangles} />
                </Box>
                <Box ref={logRef} sx={{ display: 'flex', height: '30%', flexDirection: "column", borderTop: '1px #505a5e solid', overflow: 'auto', overflowX: 'hidden' }}>
                    {
                        results.map((result, index) => {
                            return <Typography variant='body2' key={`log-${index}`}>
                                {
                                    `突破${(result.type === 'industry' ? '板块' : '个股')} ${result.code} ${result.name} + ${result.change_pct}% ${result.result.new_high_days}日新高`
                                }
                            </Typography>
                        })
                    }
                </Box>
            </Paper>
        </Box>
    );
}