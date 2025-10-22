'use client'
import CommonPriceTable from '@/components/CommonPriceTable/CommonPriceTable';
import TradingViewWidget, { Candlestick, RectangleRegion } from '@/components/TradingViewWidget_v2';
import { Box, Button, Paper, Typography } from '@mui/material';
import React from 'react';

interface BreakoutStrategyExecutingResult {
    type: 'stock' | 'industry';
    code: string;
    name: string;
    change_pct: number;
    result: {
        is_break_out: boolean;
        new_high_days: number;
    },
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
export default function StrategyExecutionPage() {
    const [isExecuting, setIsExecuting] = React.useState(false)
    const [results, setResults] = React.useState<BreakoutStrategyExecutingResult[]>([])
    const [candlesticks, setCandlesticks] = React.useState<Candlestick[]>([])
    const [rectangles, setRectangles] = React.useState<RectangleRegion[]>([])
    const logRef = React.useRef(null)

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
            if(res.type === 'industry'){
                res.name = res.name + ' -【板块】'
            }else{
                res.name = res.code + ' ' + res.name  
            }
            batchResults.push(res)
        };

        ws.onclose = () => {
            setIsExecuting(false)
            if (batchId !== null){
                setResults(batchResults);
                clearInterval(batchId)
                batchId = null
            }
        }
    }

    const handleSelectChange = (newSelectedId: number) => {
        if (selectedId === newSelectedId){
            newSelectedId = -1;
        }

        setSelectedId(newSelectedId)

        if (newSelectedId === -1){
            return;
        }

        async function fetchStockDayPrice(){
            try{
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
                let tmp:RectangleRegion[] = []
                let selectedResult = results[newSelectedId]
                if (selectedResult.rectangle_recent !== undefined){
                    let rect = selectedResult.rectangle_recent
                    console.log(rect, rect.start_date)
                    tmp.push({
                        pointA: {time: rect.start_date, price: rect.low_price},
                         pointB: {time: rect.end_date, price: rect.high_price}
                    })
                }
                if (selectedResult.rectangle_large !== undefined){
                    let rect = selectedResult.rectangle_large
                    tmp.push({
                        pointA: {time: rect.start_date, price: rect.low_price},
                         pointB: {time: rect.end_date, price: rect.high_price}
                    })
                }
                console.log(tmp)
                setRectangles(tmp)
            }catch(exception){
                console.log(exception)
            }
        }
        async function fetchIndustryDayPrice(){
            try{
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
                let tmp:RectangleRegion[] = []
                let selectedResult = results[newSelectedId]
                if (selectedResult.rectangle_recent !== undefined){
                    let rect = selectedResult.rectangle_recent
                    console.log(rect, rect.start_date)
                    tmp.push({
                        pointA: {time: rect.start_date, price: rect.low_price},
                         pointB: {time: rect.end_date, price: rect.high_price}
                    })
                }
                if (selectedResult.rectangle_large !== undefined){
                    let rect = selectedResult.rectangle_large
                    tmp.push({
                        pointA: {time: rect.start_date, price: rect.low_price},
                         pointB: {time: rect.end_date, price: rect.high_price}
                    })
                }
                console.log(tmp)
                setRectangles(tmp)
            }catch(exception){
                console.log(exception)
            }
        }

        if (results[newSelectedId].type === 'stock')
            fetchStockDayPrice()
        else
            fetchIndustryDayPrice()
    }

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex' }}>
            <Paper sx={{ width: '40%', display: 'flex', flexDirection: 'column' }} square>
                <Button variant='outlined' sx={{ margin: 1 }} onClick={handleExecute} disabled={isExecuting}>执行</Button>
                <CommonPriceTable
                    enablePrice={false}
                    columnNames={['', '名称', '涨幅(%)']}
                    columnWidths={['20%', '40%', '40%']}
                    selectedId={selectedId}
                    onSelectedChange={handleSelectChange}
                    rows={results.map((result, index) => ({ id: index, code: result.code, name: result.name, change_pct: result.change_pct }))} />
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