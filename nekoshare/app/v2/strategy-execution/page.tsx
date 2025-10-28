'use client'
import CommonPriceTable from '@/components/CommonPriceTable/CommonPriceTable';
import TradingViewWidget, { Candlestick, RectangleRegion } from '@/components/TradingViewWidget_v2';
import { Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, TextField, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';

import React from 'react';
import BackTracePriceTable from '@/components/BacktracePriceTable/BacktracePriceTable';
import StockDayPrice from '@/lib/StockDayPrice';
import THSIndustryDayPrice from '@/lib/THSIndustryDayPrice';

interface Reward {
    afterDay: number
    threeDay: number
    fiveDay: number
}

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
    reward?: Reward;
}


export default function StrategyExecutionPage() {
    const [isExecuting, setIsExecuting] = React.useState(false)
    const [results, setResults] = React.useState<BreakoutStrategyExecutingResult[]>([])
    const [rewards, setRewards] = React.useState<Reward[]>([])
    const [candlesticks, setCandlesticks] = React.useState<Candlestick[]>([])
    const [rectangles, setRectangles] = React.useState<RectangleRegion[]>([])
    const logRef = React.useRef(null)
    const [selectedTradeDate, setSelectedTradeDate] = React.useState<Dayjs>(dayjs(new Date()));

    const [selectedId, setSelectedId] = React.useState(-1)



    React.useEffect(() => {
        if (logRef.current !== null) {
            let logContainer = logRef.current as HTMLElement;
            logContainer.scrollTo({ top: logContainer.scrollHeight })
        }
    }, [results])

    const handleExecute = () => {
        setIsExecuting(true);
        setResults([])
        setCandlesticks([])
        setRectangles([])

        const ws = new WebSocket(`ws://${process.env.NEXT_PUBLIC_PYSDK_HOST}/ws/breakout_execution`);
        let batchResults: BreakoutStrategyExecutingResult[] = []
        let batchId: NodeJS.Timeout | null = null
        ws.onopen = () => {
            console.log("连接成功");
            ws.send(JSON.stringify({ end_date: selectedTradeDate.format("YYYYMMDD"), start_date: selectedTradeDate.subtract(3, 'month').format("YYYYMMDD") }));
            batchId = setInterval(() => {
                setResults([...batchResults]);
            }, 1000);
        };

        ws.onmessage = (event) => {
            let res = JSON.parse(event.data as string) as BreakoutStrategyExecutingResult;
            if (res.type === 'industry') {
                res.name = '【板块】' + res.name
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
            async function calculateRewards() {
                for (let i = 0; i < batchResults.length; i++) {
                    if (batchResults[i].type === 'stock') {
                        let stockCode = batchResults[i].code;
                        let response = await fetch(`/api/pysdk/stock/getStockDayPrice?code=${stockCode}&start_date=${selectedTradeDate.format("YYYYMMDD")}&start_delta=5`);
                        if (!response.ok) {
                            throw new Error('网络响应错误');
                        }
                        let data = (await response.json()).data as StockDayPrice[];
                        let day = (i: number) => {console.log( data, data.length, i ) ; return i >= data.length ? 0 : data[i].close};
                        //从day0 到 day5
                        let day0 = day(0);
                        let day1 = day(1);
                        let day2 = day(2);
                        let day3 = day(3);
                        let day4 = day(4);
                        let day5 = day(5);
                        let reward: Reward = {
                            afterDay: data.length > 1 ? (day1 - day0) / day0 * 100  : 0,
                            threeDay: data.length > 1 ? (Math.max(day1, day2, day3) - day0) /day0 * 100: 0,
                            fiveDay: data.length > 1 ? (Math.max(day1, day2, day3, day4, day5) - day0) /day0 * 100: 0
                        }
                        batchResults[i].reward = reward
                    } else {
                        let code = batchResults[i].code;
                        let response = await fetch(`/api/pysdk/ths/getIndustryDayPrice?code=${code}&start_date=${selectedTradeDate.format("YYYYMMDD")}&start_delta=5`);
                        if (!response.ok) {
                            throw new Error('网络响应错误');
                        }
                        let data = (await response.json()).data as THSIndustryDayPrice[];
                        let day = (i: number) => { console.log(data,data.length, i ) ; return i >= data.length ? 0 : data[i].close};


                        //从day0 到 day5
                        let day0 = day(0);
                        let day1 = day(1);
                        let day2 = day(2);
                        let day3 = day(3);
                        let day4 = day(4);
                        let day5 = day(5);
                        let reward: Reward = {
                            afterDay: data.length > 1 ? (day1 - day0) / day0 * 100 : 0,
                            threeDay: data.length > 1 ? (Math.max(day1, day2, day3) - day0) /day0 * 100 : 0,
                            fiveDay: data.length > 1 ? (Math.max(day1, day2, day3, day4, day5) - day0) /day0 * 100 : 0
                        }
                        batchResults[i].reward = reward
                    }
                    setResults([...batchResults]);
                }
            }
            calculateRewards()
            localStorage.setItem('v2/strategy-execution::breakout_results:' + selectedTradeDate.format("YYYYMMDD"), JSON.stringify(batchResults));

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
                let stockCode = results[newSelectedId].code;
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

        if (results[newSelectedId].type === 'stock')
            fetchStockDayPrice()
        else
            fetchIndustryDayPrice()
    }

    React.useEffect(() => {
        const breakoutResults = localStorage.getItem('v2/strategy-execution::breakout_results:' + selectedTradeDate.format("YYYYMMDD"))
        if (breakoutResults !== null) {
            setResults(JSON.parse(breakoutResults))
        } else {
            setResults([])
        }
    }, [selectedTradeDate])

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex' }}>
            <Paper sx={{ width: '40%', display: 'flex', flexDirection: 'column' }} square>
                <Box sx={{ display: 'flex', padding: '8px 8px', marginTop: '8px' }}>
                    <FormControl sx={{ marginRight: '8px', width: '30%' }} >
                        <InputLabel id="strategy-select-label-id">策略选择</InputLabel>
                        <Select
                            defaultValue={0}
                            size='small'
                            labelId='strategy-select-label-id'
                            label="策略选择"
                        >
                            <MenuItem value={0}>板块共振突破</MenuItem>
                            <MenuItem value={20} disabled>平台突破</MenuItem>
                            <MenuItem value={30} disabled>双突破</MenuItem>
                        </Select>
                    </FormControl>
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='zh-cn'>
                        <DatePicker
                            label="回溯日期"
                            format='YYYY-MM-DD'
                            value={dayjs(selectedTradeDate)}
                            onChange={val => val && setSelectedTradeDate(val)}
                            slotProps={{ textField: { size: 'small' } }}
                            sx={{ marginRight: '8px' }} />
                    </LocalizationProvider>
                    <Button variant='outlined' onClick={handleExecute} disabled={isExecuting} sx={{ flexGrow: 1, width: '30%' }}>执行</Button>
                </Box>
                <BackTracePriceTable
                    enableBackTrace
                    columnNames={['', '名称', '涨幅(%)', '次日', '三日', '五日']}
                    columnWidths={['10%', '30%', '15%', '15%', '15%', '15%']}
                    selectedId={selectedId}
                    onSelectedChange={handleSelectChange}
                    rows={results.map((result, index) => ({
                        id: index,
                        code: result.code,
                        name: result.name,
                        change_pct: result.change_pct,
                        afterDay: result.reward?.afterDay ?? 0,
                        threeDay: result.reward?.threeDay ?? 0,
                        fiveDay: result.reward?.fiveDay ?? 0
                    }))} />
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