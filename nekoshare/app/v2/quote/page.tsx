'use client'
import StockData from '@/lib/StockData';
import { Box, Button, Divider, Paper, Typography } from '@mui/material';
import React, { useEffect } from 'react';
import TradingViewWidget, { Candlestick, TrendLine } from '@/components/TradingViewWidget_v2';
import CommonPriceTable from '@/components/CommonPriceTable/CommonPriceTable';
import { THSIndustryMarket, GetIndustriesResponse } from '@/app/api/ths/getIndustries/route';
import { GetIndustryStocksResponse } from '@/app/api/ths/getIndustryStocks/route';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import MarketIndexDayPrice from '@/lib/MarketIndexDayPrice';

interface StockConcept {
    id: number;
    stock_code: string;
    stock_name: string;
    concept_code: string;
    concept_name: string;
    explain: string;
    weight: number;
}



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

const riseColor = '#ec3a37';
const fallColor = '#0093ad';

function priceColor(change: number): string {
    return change > 0 ? riseColor : fallColor;
}

export default function Home() {
    const [industries, setIndustries] = React.useState<THSIndustryMarket[]>([]);
    const [industryStocks, setIndustryStocks] = React.useState<StockData[]>([]);

    const [selectedIndustry, setSelectedIndustry] = React.useState<number>(-1);
    const [selectedStock, setSelectedStock] = React.useState<number>(-1);

    const [candlesticks, setCandlesticks] = React.useState<Candlestick[]>([]);
    const [trendLines, setTrendLines] = React.useState<TrendLine[]>([]);

    const [advanceDeclineData, setAdvanceDeclineData] = React.useState<any[]>([]);
    const [conceptList, setConceptList] = React.useState<StockConcept[]>([]);

    const [adStartDate, setAdStartDate] = React.useState(dayjs().subtract(1, 'month').format('YYYY-MM-DD'));
    const [adEndDate, setAdEndDate] = React.useState(dayjs().format('YYYY-MM-DD'));

    const [selectedIndicator, setSelectedIndicator] = React.useState<'USHI1A0001' | 'URFI883421' | 'rise_amount'>('USHI1A0001');
    const [USHI1A0001Candlesticks, setUSHI1A0001Candlesticks] = React.useState<Candlestick[]>([])
    const [URFI883421Candlesticks, setURFI883421Candlesticks] = React.useState<Candlestick[]>([])

    useEffect(() => {
        async function fetchAdvanceDecline() {
            try {
                const response = await fetch(`/api/pysdk/focus/get_advance_decline_count?start_date=${adStartDate}&end_date=${adEndDate}`);
                if (!response.ok) throw new Error('网络响应错误');
                const data = await response.json();
                setAdvanceDeclineData(data);
            } catch (error) {
                console.error('获取涨跌家数失败:', error);
            }
        }
        fetchAdvanceDecline();
    }, [adStartDate, adEndDate]);

    const goToPrevMonth = () => {
        setAdEndDate(adStartDate);
        setAdStartDate(dayjs(adStartDate).subtract(1, 'month').format('YYYY-MM-DD'));
    };

    const goToNextMonth = () => {
        const nextEnd = adEndDate;
        const nextStart = dayjs(adStartDate).add(1, 'month').format('YYYY-MM-DD');
        if (dayjs(nextStart).isAfter(dayjs())) return;
        setAdStartDate(nextStart);
        setAdEndDate(dayjs(nextEnd).add(1, 'month').format('YYYY-MM-DD'));
    };

    const isNextDisabled = dayjs(adStartDate).add(1, 'month').isAfter(dayjs());

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

        async function fetchMarketIndex() {
            try {
                let response = await fetch('/api/pysdk/market_index/quote?code=USHI1A0001');
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                let data = await response.json() as MarketIndexDayPrice[];
                setUSHI1A0001Candlesticks(data.map(d => ({
                    time: d.trade_date,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close,
                    volume: d.volume,
                })))

                response = await fetch('/api/pysdk/market_index/quote?code=URFI883421');
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                data = await response.json() as MarketIndexDayPrice[];
                setURFI883421Candlesticks(data.map(d => ({
                    time: d.trade_date,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close,
                    volume: d.volume,
                })))

            } catch (error) {
                console.error('获取数据失败:', error);
            }
        }

        fetchIndustries();
        fetchMarketIndex();
    }, []);

    useEffect(() => {
        async function fetchCandlesticks() {
            try {
                if (selectedIndustry === -1) {
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

                    response = await fetch(`/api/pysdk/ths/getTrendLines?code=${industries[selectedIndustry].code}&start_date=20250601&end_date=${dayjs().format('YYYYMMDD')}`);
                    if (!response.ok) {
                        throw new Error('网络响应错误');
                    }
                    data = await response.json();
                    setTrendLines(data.data.map((item: { start_date: string, end_date: string, high_price: number, low_price: number }) => ({
                        startPoint: {
                            time: dayjs(item.start_date).format("YYYY-MM-DD"),
                            price: item.low_price
                        },
                        endPoint: {
                            time: dayjs(item.end_date).format("YYYY-MM-DD"),
                            price: item.high_price
                        }
                    })));
                    return;
                }

                let stockCode = industryStocks[selectedStock].stock_code;
                let response = await fetch('/api/pysdk/stock/getStockDayPrice?code=' + stockCode);
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                let data = await response.json();
                //转换数据格式
                const candlestickData: Candlestick[] = data.data.map((item: any) => ({
                    time: dayjs(item.trade_date).format("YYYY-MM-DD"),
                    open: item.open,
                    high: item.high,
                    low: item.low,
                    close: item.close,
                    volume: item.volume
                }));
                setCandlesticks(candlestickData);

                response = await fetch(`/api/pysdk/stock/getTrendLines?code=${stockCode}&start_date=20250601&end_date=${dayjs().format('YYYYMMDD')}`);
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                data = await response.json();
                setTrendLines(data.data.map((item: { start_date: string, end_date: string, high_price: number, low_price: number }) => ({
                    startPoint: {
                        time: dayjs(item.start_date).format("YYYY-MM-DD"),
                        price: item.low_price
                    },
                    endPoint: {
                        time: dayjs(item.end_date).format("YYYY-MM-DD"),
                        price: item.high_price
                    }
                })));


            } catch (error) {
                console.error('获取数据失败:', error);
            }
        }

        fetchCandlesticks();
    }, [selectedIndustry, selectedStock]);

    useEffect(() => {
        async function fetchConceptList() {
            if (selectedStock === -1) {
                setConceptList([]);
                return;
            }
            try {
                let stockCode = industryStocks[selectedStock].stock_code;
                let resp = await fetch(`/api/pysdk/focus/get_stock_concept?stock_code=${stockCode}`);
                if (resp.ok) {
                    let data = await resp.json();
                    setConceptList(data);
                }
            } catch (error) {
                console.error('获取概念列表失败:', error);
            }
        }
        fetchConceptList();
    }, [selectedStock]);

    const handleIndustrySelectedChanged = (index: number) => {
        if (index === -1) {
            return;
        }
        setSelectedIndustry(index);
        setSelectedStock(-1);
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

    const border = '1px solid rgba(0,0,0,0.12)';
    const stock = selectedStock !== -1 ? industryStocks[selectedStock] : null;
    const industry = selectedIndustry !== -1 ? industries[selectedIndustry] : null;

    return (
        <Box sx={{ display: 'flex', flexGrow: 1, height: 'calc(100vh - 64px)' }}>
            {/* 左侧：行业 + 个股列表 */}
            <Box sx={{ width: '20%', height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ height: '50%', maxHeight: '50%' }}>
                    <CommonPriceTable
                        enablePrice={false}
                        columnNames={[' ', '板块名称', '涨幅(%)']}
                        columnWidths={['10%', '60%', '30%']}
                        rows={industries.map((industry, index) => ({ id: index, code: industry.code, name: industry.name, change_pct: industry.change_pct }))}
                        selectedId={selectedIndustry}
                        onSelectedChange={handleIndustrySelectedChanged}
                    />
                </Box>
                <Box sx={{ height: '50%', maxHeight: '50%' }}>
                    <CommonPriceTable
                        enablePrice={true}
                        columnNames={[' ', '名称', '涨幅(%)', '现价']}
                        columnWidths={['10%', '30%', '30%', '30%']}
                        selectedId={selectedStock}
                        rows={industryStocks.map((stock, index) => ({ id: index, code: stock.stock_code, name: stock.stock_name, change_pct: stock.percent_change, price: stock.price }))}
                        onSelectedChange={(newSelected) => setSelectedStock(newSelected)}
                    />
                </Box>

            </Box>

            {/* 中间：K线图 + 信息面板 */}
            <Paper sx={{ width: '35%', display: 'flex', flexDirection: 'column' }} square elevation={0}>
                <Box sx={{ flex: 1, minHeight: 0, height: '50%' }}>
                    <TradingViewWidget candlesticks={candlesticks} rectangles={[]} trendLines={trendLines} />
                </Box>
                <Box sx={{ borderTop: border, px: 1.5, py: 0.5, minHeight: 80, height: '50%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    {stock && (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                <Typography variant='h6' fontWeight={600}>{stock.stock_name}</Typography>
                                <Typography variant='body2' color='text.secondary'>{stock.stock_code}</Typography>
                                <Typography variant='h6' sx={{ color: priceColor(stock.percent_change), ml: 'auto' }}>
                                    {stock.price.toFixed(2)}
                                </Typography>
                                <Typography variant='body2' sx={{ color: priceColor(stock.percent_change), fontWeight: 500 }}>
                                    {stock.percent_change > 0 ? '+' : ''}{(stock.price - stock.pre_close).toFixed(2)}
                                    {' '}{stock.percent_change > 0 ? '+' : ''}{stock.percent_change.toFixed(2)}%
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                <Typography variant='body2' sx={{ color: priceColor(stock.open - stock.pre_close) }}>
                                    开 {stock.open.toFixed(2)}
                                </Typography>
                                <Typography variant='body2' color='text.secondary'>
                                    收 {stock.pre_close.toFixed(2)}
                                </Typography>
                                <Typography variant='body2' sx={{ color: priceColor(stock.high - stock.pre_close) }}>
                                    高 {stock.high.toFixed(2)}
                                </Typography>
                                <Typography variant='body2' sx={{ color: priceColor(stock.low - stock.pre_close) }}>
                                    低 {stock.low.toFixed(2)}
                                </Typography>
                                <Typography variant='body2' color='text.secondary'>
                                    流通股 {stock.float_share}
                                </Typography>
                                <Typography variant='body2' color='text.secondary'>
                                    市值 {stock.float_cap}亿
                                </Typography>
                                <Typography variant='body2' color='text.secondary'>
                                    市盈率 {stock.pe_ratio.toFixed(2)}
                                </Typography>
                                <Typography variant='body2' color='text.secondary'>
                                    {stock.industry} {stock.area}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                    {!stock && industry && (
                        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, py: 0.5 }}>
                            <Typography variant='h6' fontWeight={600}>{industry.name}</Typography>
                            <Typography variant='body2' color='text.secondary'>{industry.code}</Typography>
                            <Typography variant='h6' sx={{ color: priceColor(industry.change_pct) }}>
                                {industry.change_pct > 0 ? '+' : ''}{industry.change_pct.toFixed(2)}%
                            </Typography>
                        </Box>
                    )}
                    <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', mt: 1, ...customizedHiddenScrollBarStyle, ':hover': { ...customizedScrollBarStyle } }}>
                        {conceptList.map((concept) => (
                            <Box key={concept.id} sx={{ py: 0.5, borderBottom: '1px solid #f0f0f0' }}>
                                <Typography variant='body2'>
                                    {concept.concept_name} <Typography component='span' variant='caption' color='text.secondary'>权重: {concept.weight.toFixed(2)}</Typography>
                                </Typography>
                                {concept.explain && (
                                    <Typography variant='caption' color='text.secondary' sx={{ display: 'block', lineHeight: 1.3 }}>
                                        {concept.explain}
                                    </Typography>
                                )}
                            </Box>
                        ))}
                    </Box>
                </Box>
            </Paper>

            {/* 右侧：涨跌家数 + 情绪 */}
            <Box sx={{ width: '50%', display: 'flex', flexDirection: 'column', maxWidth: '50%', overflow: 'hidden' }}>
                <Paper sx={{ height: '50%', minHeight: 0 }} square>


                    {
                        selectedIndicator === 'USHI1A0001' && <TradingViewWidget candlesticks={USHI1A0001Candlesticks} rectangles={[]} trendLines={[]} enableMAHighlight />

                    }
                    {
                        selectedIndicator === 'URFI883421' && <TradingViewWidget candlesticks={URFI883421Candlesticks} rectangles={[]} trendLines={[]} enableMAHighlight />

                    }
                    {
                        selectedIndicator === 'rise_amount' &&
                        <Paper sx={{ flex: 1, display: 'flex', flexDirection: 'column', borderRadius: 0, height: '100%' }} square>
                            <Box sx={{ display: 'flex', alignItems: 'center', px: 1.5, pt: 1, gap: 1 }}>
                                <Typography variant='subtitle2' sx={{ color: 'text.secondary', mr: 'auto' }}>
                                    每日涨跌家数
                                    <Typography variant='caption' sx={{ ml: 1, color: 'text.disabled' }}>
                                        {adStartDate} ~ {adEndDate}
                                    </Typography>
                                </Typography>
                                <Button size='small' variant='outlined' onClick={goToPrevMonth}>
                                    上一个月
                                </Button>
                                <Button size='small' variant='outlined' onClick={goToNextMonth} disabled={isNextDisabled}>
                                    下一个月
                                </Button>
                            </Box>
                            <Box sx={{ flex: 1, minHeight: 0 }}>
                                <ReactECharts
                                    style={{ height: '100%', width: '100%' }}
                                    option={{
                                        tooltip: { trigger: 'axis' },
                                        legend: { data: ['上涨', '下跌'], top: 2, right: 10, textStyle: { fontSize: 11 }, selected: { '上涨': true, '下跌': false } },
                                        grid: { left: 36, right: 8, top: 28, bottom: 18 },
                                        xAxis: {
                                            type: 'category',
                                            data: advanceDeclineData.map((d: any) => d.trade_date.slice(5)),
                                            axisLabel: { fontSize: 10, interval: 3 },
                                            axisLine: { lineStyle: { color: '#e0e0e0' } },
                                            splitLine: { show: false },
                                        },
                                        yAxis: {
                                            type: 'value',
                                            axisLabel: { fontSize: 10 },
                                            splitLine: { show: false },
                                        },
                                        series: [
                                            {
                                                name: '上涨',
                                                type: 'line',
                                                data: advanceDeclineData.map((d: any) => d.advance_count),
                                                smooth: true,
                                                lineStyle: { width: 2, color: riseColor },
                                                itemStyle: { color: riseColor },
                                                areaStyle: { color: 'rgba(236, 58, 55, 0.08)' },
                                                symbol: 'circle',
                                                symbolSize: 6,
                                                // label: { show: true, fontSize: 10, formatter: '{c}' },
                                                markLine: {
                                                    silent: true,
                                                    animation: false,
                                                    data: [
                                                        { yAxis: 3500, lineStyle: { color: '#999', type: 'dashed' } },
                                                        { yAxis: 1200, lineStyle: { color: '#999', type: 'dashed' } },
                                                    ],
                                                },
                                            },
                                            {
                                                name: '下跌',
                                                type: 'line',
                                                data: advanceDeclineData.map((d: any) => d.decline_count),
                                                smooth: true,
                                                lineStyle: { width: 2, color: fallColor },
                                                itemStyle: { color: fallColor },
                                                areaStyle: { color: 'rgba(0, 147, 173, 0.08)' },
                                                symbol: 'circle',
                                                symbolSize: 6,
                                                // label: { show: true, fontSize: 10, formatter: '{c}' },
                                            },
                                        ],
                                    }}
                                />
                            </Box>
                        </Paper>
                    }
                </Paper>
                <Paper sx={{ display: 'flex', flexDirection: 'column', height: '50%', borderRadius: 0, flex: '1 0 1', maxHeight: '50%', overflow: 'auto' }} square>
                    <Paper square sx={{ display: 'flex', py: 1 }}>
                        <Button sx={{ ml: 1 }} variant={selectedIndicator === 'USHI1A0001' ? 'outlined' : 'text'} size='small' onClick={() => setSelectedIndicator('USHI1A0001')} >上证指数</Button>
                        <Button sx={{ ml: 1 }} variant={selectedIndicator === 'URFI883421' ? 'outlined' : 'text'} size='small' onClick={() => setSelectedIndicator('URFI883421')} >同花顺全A(沪深)</Button>
                        <Button sx={{ ml: 1 }} variant={selectedIndicator === 'rise_amount' ? 'outlined' : 'text'} size='small' onClick={() => setSelectedIndicator('rise_amount')} >涨跌家数</Button>
                    </Paper>
                    <Box display='flex' flexDirection='column' sx={{ m: 1 }}>
                        <Typography variant='body1' color='text' sx={{ my: 1 }}>
                            指数分析：
                        </Typography>

                        <Typography variant='body2' color='text.secondary'>
                            当前上证指数的5日线位于10日线之下，为震荡区间/下降趋势
                            <br />
                            指数位于5日线与10日线之下，应当空仓
                        </Typography>
                        <Typography variant='body1' color='text' sx={{ my: 1 }}>
                            情绪分析：
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                            当前上涨家数1300家，暂无明显倾向
                        </Typography>
                        <Divider sx={{ my: 1 }} />
                        <Typography variant='body1' color='text.secondary' sx={{ my: 1 }}>
                            说明：
                        </Typography>
                        <Typography variant='body2' color='text.secondary'>
                            当5日线位于10日线之上，且指数位于5日线之上时，为上升趋势
                            <br />
                            若指数首次跌破5日线，则应减仓注意风险，跌破10日线则应该清仓。
                            <br />
                            但首次跌破可能只会变成震荡区间而不是反转，取决于左侧强度，震荡区间指数会反复穿梭于均线
                            <br />
                            当5日线位于10日线之下，则为下降趋势，应当空仓观望
                            <br />
                            上升趋势由5日线从下向上穿过10日线为开始，俗称“金叉”
                            <br />
                            <br />
                            上涨家数大于3500，警惕情绪过热，不开新仓
                            <br />
                            上涨家数小于1200，可能情绪低点，适合轻仓低吸博弈，警惕指数破位
                        </Typography>
                    </Box>

                </Paper>
            </Box>
        </Box>
    )
}
