'use client'
import { Box, Paper, Typography } from '@mui/material';
import ReactECharts from "echarts-for-react";
import { EChartsOption } from 'echarts';
import React from 'react';
import TradingViewWidget, { Candlestick } from '@/components/TradingViewWidget_v2';
import MarketIndexDayPrice from '@/lib/MarketIndexDayPrice';

interface PressurePoint {
    trade_date: string;
    price: number;
}

interface BreakoutStock {
    type: string;
    code: string;
    name: string;
    change_pct: number;
    pressure_points: PressurePoint[];
}

interface BacktraceStock {
    stock_code: string;
    stock_name: string;
    buy_date: string;
    buy_price: number;
    sell_date: string;
    sell_price: number;
    sell_reason: string;
    change_pct: number;
}

interface BacktestDayData {
    breakout_count: number;
    breakout_stocks?: BreakoutStock[];
    backtrace_count: number;
    backtrace_stocks?: BacktraceStock[];
    total_return: number;
    avg_return: number;
    max_profit: number;
    max_drawdown: number;
}

interface BacktestOverviewResponse {
    data: Record<string, BacktestDayData>;
}

type BacktestData = Record<string, BacktestDayData>;

function calculateMA(data: Candlestick[], n: number): { time: string; value: number }[] {
    const result: { time: string; value: number }[] = [];
    const chunk: number[] = [];
    for (let i = 0; i < data.length; i++) {
        chunk.push(data[i].close);
        if (chunk.length > n) chunk.shift();
        const sum = chunk.reduce((acc, cur) => acc + cur, 0) / chunk.length;
        result.push({ time: data[i].time, value: sum });
    }
    return result;
}

export default function BacktracePage() {
    const [data, setData] = React.useState<BacktestData>({});
    const [loading, setLoading] = React.useState(true);
    const [marketCandlesticks, setMarketCandlesticks] = React.useState<Candlestick[]>([]);
    const [from, setFrom] = React.useState()
    const [to, setTo] = React.useState()

    React.useEffect(() => {
        fetch('/api/pysdk/trade/getBacktestOverview')
            .then(res => res.json() as Promise<BacktestOverviewResponse>)
            .then(json => {
                setData(json.data);
                setLoading(false);
            })
            .catch(err => {
                console.error('获取回测数据失败', err);
                setLoading(false);
            });
    }, []);

    React.useEffect(() => {
        if (data && data.b) {

        }
    }, [data]);

    React.useEffect(() => {
        fetch('/api/pysdk/market_index/quote?code=URFI883421')
            .then(res => res.json() as Promise<MarketIndexDayPrice[]>)
            .then(data => {
                setMarketCandlesticks(data.map(d => ({
                    time: d.trade_date,
                    open: d.open,
                    high: d.high,
                    low: d.low,
                    close: d.close,
                    volume: d.volume,
                })));
            })
            .catch(err => console.error('获取全A指数数据失败', err));
    }, []);

    // 计算全A指数均线，找出 5日线>10日线 且 收盘价>5日线 的日期
    const trendUpSet = React.useMemo(() => {
        const set = new Set<string>();
        if (marketCandlesticks.length < 10) return set;
        const ma5 = calculateMA(marketCandlesticks, 5);
        const ma10 = calculateMA(marketCandlesticks, 10);
        for (let i = 0; i < marketCandlesticks.length; i++) {
            if (ma5[i].value > ma10[i].value && marketCandlesticks[i].close > ma5[i].value) {
                set.add(marketCandlesticks[i].time.replace(/-/g, ''));
            }
        }
        return set;
    }, [marketCandlesticks]);

    if (loading) {
        return (
            <Paper sx={{ width: '100%', height: '100%' }} square>
                <Typography sx={{ p: 4 }}>加载中...</Typography>
            </Paper>
        )
    }

    const dates = Object.keys(data).sort();
    if (dates.length === 0) {
        return <Typography sx={{ p: 4 }}>暂无回测数据</Typography>;
    }

    const formatLabel = (d: string) => `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;

    // 图表1：选股/买入数量（堆叠）
    const countOption: EChartsOption = {
        tooltip: { trigger: 'axis' },
        legend: { data: ['选股数量', '买入数量'], textStyle: { color: '#ccc' } },
        grid: { left: '3%', right: '4%', bottom: '13%', containLabel: true },
        xAxis: {
            type: 'category',
            data: dates.map(formatLabel),
            axisLabel: { color: '#999' },
        },
        yAxis: {
            type: 'value',
            axisLabel: { color: '#999' },
        },
        series: [
            {
                name: '买入数量',
                type: 'bar',
                data: dates.map(d => ({
                    value: data[d]?.backtrace_count ?? 0,
                    itemStyle: trendUpSet.has(d) ? { color: '#91cc75' } : { color: '#91cc75', opacity: 0.3 },
                })),
            },
            {
                name: '选股数量',
                type: 'bar',
                data: dates.map(d => ({
                    value: data[d]?.breakout_count ?? 0,
                    itemStyle: trendUpSet.has(d) ? { color: '#5470c6' } : { color: '#5470c6', opacity: 0.3 },
                })),
            },
        ],
    };

    // 图表2：收益率指标 — 图例单选切换
    const returnOption: EChartsOption = {
        tooltip: {
            trigger: 'axis',
            formatter: (params) => {
                if (!Array.isArray(params)) return '';
                const p = params as any[];
                const dateKey = p[0].axisValue.replace(/-/g, '');
                const dayData = data[dateKey];
                if (!dayData) return '';
                let html = `<strong>${p[0].axisValue}</strong><br/>`;
                html += `总收益率: ${(dayData.total_return * 100).toFixed(2)}%<br/>`;
                html += `平均收益率: ${(dayData.avg_return * 100).toFixed(2)}%<br/>`;
                html += `最大盈利: ${(dayData.max_profit * 100).toFixed(2)}%<br/>`;
                html += `最大回撤: ${(dayData.max_drawdown * 100).toFixed(2)}%`;
                return html;
            },
        },
        legend: {
            type: 'scroll',
            selectedMode: 'single',
            selected: { '平均收益率': true },
            data: ['收益率求和', '平均收益率', '最大盈利', '最大回撤'],
            textStyle: { color: '#ccc' },
        },
        grid: { left: '3%', right: '4%', top: '12%', bottom: '13%', containLabel: true },
        xAxis: {
            type: 'category',
            data: dates.map(formatLabel),
            axisLabel: { color: '#999' },
        },
        yAxis: {
            type: 'value',
            axisLabel: {
                color: '#999',
                formatter: (v: number) => `${(v * 100).toFixed(0)}%`,
            },
        },
        series: [
            {
                name: '收益率求和',
                type: 'bar',
                data: dates.map(d => ({
                    value: data[d].total_return,
                    itemStyle: trendUpSet.has(d) ? { color: '#fac858' } : { color: '#fac858', opacity: 0.2 },
                })),
            },
            {
                name: '平均收益率',
                type: 'bar',
                data: dates.map(d => ({
                    value: data[d].avg_return,
                    itemStyle: trendUpSet.has(d) ? { color: '#91cc75' } : { color: '#91cc75', opacity: 0.2 },
                })),
            },
            {
                name: '最大盈利',
                type: 'bar',
                data: dates.map(d => ({
                    value: data[d].max_profit,
                    itemStyle: trendUpSet.has(d) ? { color: '#ee6666' } : { color: '#ee6666', opacity: 0.2 },
                })),
            },
            {
                name: '最大回撤',
                type: 'bar',
                data: dates.map(d => ({
                    value: data[d].max_drawdown,
                    itemStyle: trendUpSet.has(d) ? { color: '#73c0de' } : { color: '#73c0de', opacity: 0.2 },
                })),
            },
        ],
    };

    return (
        <Paper sx={{ width: '100%', height: '100%', maxHeight: '100%', overflow: 'auto' }} square>
            <Typography variant="h6" sx={{ m: 2 }}>全景回测</Typography>
            <Paper sx={{ p: 1, m: 2, bgcolor: '#1e1e1e', height: 300 }}>
                <TradingViewWidget candlesticks={marketCandlesticks} rectangles={[]} trendLines={[]} enableMAHighlight from={`${dates[0].substring(0, 4)}-${dates[0].substring(4, 6)}-${dates[0].substring(6, 8)}`} to={`${dates[dates.length - 1].substring(0, 4)}-${dates[dates.length - 1].substring(4, 6)}-${dates[dates.length - 1].substring(6, 8)}`}   />
            </Paper>
            <Paper sx={{ p: 2, m: 2, bgcolor: '#1e1e1e' }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>选股/买入数量</Typography>
                <ReactECharts option={countOption} style={{ height: 300 }} />
            </Paper>
            <Paper sx={{ p: 2, m: 2, bgcolor: '#1e1e1e' }}>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>收益率</Typography>
                <ReactECharts option={returnOption} style={{ height: 300 }} />
            </Paper>
        </Paper>
    );
}
