'use client'
import StockData from '@/lib/StockData';
import StockDayPrice from '@/lib/StockDayPrice';
import { Box, Container, Paper, Typography } from '@mui/material';
import { AreaSeries, CandlestickSeries, createChart, ColorType, HistogramSeries } from 'lightweight-charts';
// TradingViewWidget.jsx
import React, { useEffect, useRef, memo } from 'react';
import TradingViewWidget, { Candlestick } from '@/components/TradingViewWidget_v2';
import CommonPriceTable from '@/components/CommonPriceTable/CommonPriceTable';
import { THSIndustryMarket, GetIndustriesResponse } from '../api/ths/getIndustries/route';
import { GetIndustryStocksResponse } from '../api/ths/getIndustryStocks/route';
import dayjs, { Dayjs } from 'dayjs';

export default function Home() {
    const [industries, setIndustries] = React.useState<THSIndustryMarket[]>([]);
    const [industryStocks, setIndustryStocks] = React.useState<StockData[]>([]);

    const [selectedIndustry, setSelectedIndustry] = React.useState<number>(-1);
    const [selectedStock, setSelectedStock] = React.useState<number>(-1);

    const [candlesticks, setCandlesticks] = React.useState<Candlestick[]>([]);

    useEffect(() => {

        async function fetchIndustries() {
            try {
                let response = await fetch('/api/ths/getIndustries');
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                let data = await response.json() as GetIndustriesResponse;
                setIndustries(data.industries);
                setSelectedIndustry(0);

                response = await fetch('/api/ths/getIndustryStocks?ths_industry_code=' + data.industries[0].code);
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                let data2 = await response.json() as GetIndustryStocksResponse;
                setIndustryStocks(data2.stocks);

            } catch (error) {
                console.error('获取数据失败:', error);
            }
        }

        fetchIndustries();
    }, []);

    useEffect(() => {
        async function fetchCandlesticks() {
            try {
                if (selectedIndustry === -1){
                    return;
                }
                //如果没选中股票，则查询板块K线
                if (selectedStock === -1) {
                    let response = await fetch('/api/ths/getIndustryDayPrice?ths_industry_code=' + industries[selectedIndustry].code);
                    if (!response.ok) {
                        throw new Error('网络响应错误');
                    }
                    let data = await response.json();
                    setCandlesticks(data.data);
                    return;
                }

                let stockCode = industryStocks[selectedStock].stock_code;
                let response = await fetch('/api/pysdk/stock/getStockDayPrice?code=' + stockCode);
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                let data = await response.json();
                //转换数据格式
                const formatter = new Intl.DateTimeFormat('en-CA')
                const candlestickData: Candlestick[] = data.data.map((item: any) => ({
                    time: dayjs(item.trade_date).format("YYYY-MM-DD"),
                    open: item.open,
                    high: item.high,
                    low: item.low,
                    close: item.close,
                    volume: item.volume
                }));
                setCandlesticks(candlestickData);
            } catch (error) {
                console.error('获取数据失败:', error);
            }
        }

        fetchCandlesticks();
    }, [selectedIndustry, selectedStock]);

    const handleIndustrySelectedChanged = (index: number) => {
        setSelectedIndustry(index);
        async function fetchIndustryStocks() {
            try {
                let response = await fetch('/api/ths/getIndustryStocks?ths_industry_code=' + industries[index].code);
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                let data2 = await response.json() as GetIndustryStocksResponse;
                setIndustryStocks(data2.stocks);

            } catch (error) {
                console.error('获取数据失败:', error);
            }
        }

        fetchIndustryStocks();
    }

    return (
        <Box sx={{ display: 'flex', flexGrow: 1, height: 'calc(100vh - 64px)' }}>
            <Box sx={{ width: '20%', borderRight: '1px black solid', height: '100%', overflow: 'auto' }}>
                <CommonPriceTable
                    enablePrice={false}
                    columnNames={[' ', '板块名称', '涨幅(%)']}
                    columnWidths={['10%', '60%', '30%']}
                    rows={industries.map((industry, index) => ({ id: index, code: industry.code, name: industry.name, change_pct: industry.change_pct }))}
                    selectedId={selectedIndustry}
                    onSelectedChange={handleIndustrySelectedChanged}
                />
            </Box>
            <Box sx={{ width: '20%', borderRight: '1px black solid', height: '100%', overflow: 'auto' }}>
                <CommonPriceTable
                    enablePrice={true}
                    columnNames={[' ', '名称', '涨幅(%)', '现价']}
                    columnWidths={['10%', '30%', '30%', '30%']}
                    selectedId={selectedStock}
                    rows={industryStocks.map((stock, index) => ({ id: index, code: stock.stock_code, name: stock.stock_name, change_pct: stock.percent_change, price: stock.price }))}
                    onSelectedChange={(newSelected) => setSelectedStock(newSelected)}
                />
            </Box>
            <Box sx={{ width: '60%', display: 'flex', flexDirection: 'column' }}>
                <Paper sx={{ height: '20%', borderBottom: '1px black solid' }} square>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>

                        <Typography variant='h5' sx={{ margin: 1 }}>
                            {'农业银行'}
                        </Typography>
                        <Typography variant='h6' sx={{ margin: 1 }}>
                            601288
                        </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column','.MuiTypography-root': {margin: 1, width: '96px'} }}>
                        <Box sx={{display: 'flex', }}>
                            <Typography>今开 5.00</Typography>
                            <Typography>昨收 5.00</Typography>
                            <Typography>最高 5.00</Typography>
                            <Typography>最低 5.00</Typography>
                        </Box>
                        <Box sx={{display: 'flex'}}>
                            <Typography>流通股 142.3</Typography>
                            <Typography>流通市值 300</Typography>
                            <Typography>市盈率 25</Typography>
                            <Typography>行业 银行</Typography>
                            <Typography>地区 北京</Typography>
                        </Box>
                    </Box>
                </Paper>
                <Paper sx={{ height: '60%', borderBottom: '1px black solid' }} square>
                    <TradingViewWidget candlesticks={candlesticks} rectangles={[]} />
                </Paper>
                <Paper sx={{ height: '20%' }} square>
                    大盘数据
                </Paper>
            </Box>
        </Box>
    )
}

