'use client'
import CommonPriceTable from '@/components/CommonPriceTable/CommonPriceTable';
import TradingViewWidget, { Candlestick, RectangleRegion } from '@/components/TradingViewWidget_v2';
import { Accordion, AccordionDetails, AccordionSummary, Box, Button, FormControl, InputLabel, MenuItem, Paper, Select, TextField, Typography } from '@mui/material';
import React from 'react';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import 'dayjs/locale/zh-cn'
import BackTracePriceTable from '@/components/BacktracePriceTable/BacktracePriceTable';
import { isTradingDay } from '@/lib/chinese-holidays/TradingDays';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';


const customizedHiddenScrollBarStyle = {
    '::-webkit-scrollbar': {
        width: '6px',
        height: ' 8px',
        backgroundColor: 'rgba(0,0,0,0)', /* or add it to the track */
        borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb': {
        background: 'rgba(0,0,0,0)',
        borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb:hover': {
        background: 'rgba(0,0,0,0)',
        borderRadius: '4px',
    },
    '::-webkit-scrollbar-track': {

    }
}
const customizedScrollBarStyle = {
    '::-webkit-scrollbar': {
        width: '6px',
        height: ' 8px',
        backgroundColor: '#171b2e', /* or add it to the track */
        borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb': {
        background: '#232947',
        borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb:hover': {
        background: '#293053',
        borderRadius: '4px',
    },
    '::-webkit-scrollbar-track': {

    }
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

}

interface ProfitResult {
    three_day: number
    five_day: number
    ten_day: number
}


interface BacktraceResult {
    date: string
    results: BreakoutStrategyExecutingResult[]
    backtrace_results: ProfitResult[]
    total: number
    success_num: number
}


export default function StrategyBacktracePage() {
    const [isExecuting, setIsExecuting] = React.useState(false)
    const [selectedDayId, setSelectedDayId] = React.useState(-1)
    const [results, setResults] = React.useState<BacktraceResult[]>([])
    const [candlesticks, setCandlesticks] = React.useState<Candlestick[]>([])
    const [rectangles, setRectangles] = React.useState<RectangleRegion[]>([])
    const logRef = React.useRef(null)
    const [selectedStrategyId, setSelectedStrategyId] = React.useState(0)

    const [selectedId, setSelectedId] = React.useState(-1)
    const [startTradeDate, setStartTradeDate] = React.useState<Dayjs>(dayjs("2025-10-09", "YYYY-MM-DD"));
    const [endTradeDate, setEndTradeDate] = React.useState<Dayjs>(dayjs("2025-10-31", "YYYY-MM-DD"));


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

        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const strategiesMap = new Map<number, string>([
            [0, "breakout_backtrace"],
            [1, "breakout_v1_1_backtrace"],
        ])
        const ws = new WebSocket(`${protocol}//${process.env.NEXT_PUBLIC_PYSDK_HOST}/ws/${strategiesMap.get(selectedStrategyId)}`);
        let batchResults: BreakoutStrategyExecutingResult[] = []
        let batchId: NodeJS.Timeout | null = null
        ws.onopen = () => {
            console.log("连接成功");
            ws.send(JSON.stringify({ end_date: endTradeDate.format("YYYYMMDD"), start_date: startTradeDate.format("YYYYMMDD") }));

        };

        ws.onmessage = (event) => {
            let res = JSON.parse(event.data as string) as BacktraceResult;
            setResults(prev => [...prev, res])
            console.log(res)
        };

        ws.onclose = () => {
            setIsExecuting(false)
        }
    }

    const handleSelectChange = (newSelectedDayId: number, newSelectedId: number) => {
        if (selectedId === newSelectedId) {
            newSelectedId = -1;
        }

        setSelectedId(newSelectedId)
        setSelectedDayId(newSelectedDayId)

        if (newSelectedId === -1) {
            return;
        }

        async function fetchStockDayPrice() {
            try {
                let stockCode = results[newSelectedDayId].results[newSelectedId].code;
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
                let selectedResult = results[newSelectedDayId].results[newSelectedId]
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
                let code = results[newSelectedDayId].results[newSelectedId].code;
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
                let selectedResult = results[newSelectedDayId].results[newSelectedId]
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

        if (results[newSelectedDayId].results[newSelectedId].type === 'stock')
            fetchStockDayPrice()
        else
            fetchIndustryDayPrice()
    }

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex' }}>
            <Paper sx={{ width: '40%', display: 'flex', flexDirection: 'column' }} square>
                <Box sx={{ display: 'flex', padding: '8px 8px', marginTop: '8px' }}>

                    <FormControl sx={{ marginRight: '8px', width: '30%' }} >
                        <InputLabel id="strategy-select-label-id">策略选择</InputLabel>
                        <Select
                            value={selectedStrategyId}
                            size='small'
                            labelId='strategy-select-label-id'
                            label="策略选择"
                            onChange={e=>setSelectedStrategyId(e.target.value)}
                        >
                            <MenuItem value={0}>板块共振突破</MenuItem>
                            <MenuItem value={1} >板块共振突破_v1.1</MenuItem>
                            <MenuItem value={30} disabled>双突破</MenuItem>
                        </Select>
                    </FormControl>
                    <Typography variant='body2' sx={{ width: '60%', margin: '0px 8px' }}>仅供图形参考</Typography>
                </Box>
                <Box sx={{ display: 'flex', padding: '8px 8px', marginTop: '8px' }}>
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='zh-cn'>
                        <DatePicker
                            label="开始日期"
                            format='YYYY-MM-DD'
                            value={dayjs(startTradeDate)}
                            onChange={val => val && setStartTradeDate(val)}
                            slotProps={{ textField: { size: 'small' } }}
                            shouldDisableDate={(date) => !isTradingDay(date)}
                            sx={{ marginRight: '8px' }} />
                    </LocalizationProvider>
                    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale='zh-cn'>
                        <DatePicker
                            label="结束日期"
                            format='YYYY-MM-DD'
                            value={dayjs(endTradeDate)}
                            onChange={val => val && setEndTradeDate(val)}
                            slotProps={{ textField: { size: 'small' } }}
                            shouldDisableDate={(date) => !isTradingDay(date)}
                            sx={{ marginRight: '8px' }} />
                    </LocalizationProvider>
                    <Button variant='outlined' onClick={handleExecute} disabled={isExecuting} sx={{ flexGrow: 1, width: '30%' }}>执行</Button>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', overflow: 'auto', ...customizedHiddenScrollBarStyle, ':hover': { ...customizedScrollBarStyle } }}>
                    {
                        results.map((backtradeResult, dayIndex) => {

                            return <Accordion disableGutters key={'day-' + dayIndex}>
                                <AccordionSummary
                                    expandIcon={<ExpandMoreIcon />}
                                    aria-controls="panel1-content"
                                    id="panel1-header"
                                    sx={[dayIndex === selectedDayId && {  borderLeft: '4px solid #1976d2', backgroundColor: '#314357', display: 'flex'}]}
                                >
                                    <Typography component="span">{`${backtradeResult.date}`}</Typography>
                                    <Typography component="span" sx={{ marginLeft: 'auto',width: '12ch',  }}>{`胜率 ${(backtradeResult.success_num/ backtradeResult.total * 100).toFixed(2)}%`}</Typography>
                                    <Typography component="span" sx={{ marginLeft: '8px', width: '10ch', textAlign: 'right' }}>{`${backtradeResult.success_num}/${backtradeResult.total}`}</Typography>
                                </AccordionSummary>
                                <AccordionDetails sx={{padding: '0px 0px'}}>
                                    <BackTracePriceTable
                                        enableBackTrace
                                        columnNames={['', '名称', '涨幅(%)', '三日', '五日', '十日']}
                                        columnWidths={['10%', '30%', '15%', '15%', '15%', '15%']}
                                        selectedId={selectedDayId === dayIndex ? selectedId : -1}
                                        onSelectedChange={newSelectedId=> {handleSelectChange(dayIndex, newSelectedId)}}
                                        fullHeight={true}
                                        rows={backtradeResult.results.map((result, index) => ({
                                            id: index,
                                            code: result.code,
                                            name: result.name,
                                            change_pct: result.change_pct,
                                            afterDay: backtradeResult.backtrace_results[index].three_day * 100,
                                            threeDay: backtradeResult.backtrace_results[index].five_day * 100,
                                            fiveDay: backtradeResult.backtrace_results[index].ten_day * 100
                                        }))} />
                                </AccordionDetails>
                            </Accordion>
                        })
                    }
                </Box>


            </Paper>
            <Paper sx={{ width: '60%', borderLeft: '1px #505a5e solid', display: 'flex', flexDirection: 'column' }} square>
                <Box sx={{ height: '70%' }}>
                    <TradingViewWidget candlesticks={candlesticks} rectangles={rectangles} />
                </Box>
                <Box ref={logRef} sx={{ display: 'flex', height: '30%', flexDirection: "column", borderTop: '1px #505a5e solid', overflow: 'auto', overflowX: 'hidden' }}>
                    {
                        results.map((result, dayIndex) => {
                            return result.results.map((result, index) => {
                                return <Typography variant='body2' key={`log-${dayIndex}-${index}`}>
                                    {
                                        `突破${(result.type === 'industry' ? '板块' : '个股')} ${result.code} ${result.name} + ${result.change_pct}% ${result.result.new_high_days}日新高`
                                    }
                                </Typography>
                            })

                        })
                    }
                </Box>
            </Paper>
        </Box>
    );
}