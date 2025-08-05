'use client'
import StockData from '@/lib/StockData';
import StockDayPrice from '@/lib/StockDayPrice';
import { Box, Container, Typography } from '@mui/material';
import { AreaSeries, CandlestickSeries, createChart, ColorType, HistogramSeries, createSeriesMarkers, CandlestickData, Time } from 'lightweight-charts';
import React, { useEffect, useRef, memo } from 'react';
import { PreOpenQualitiedResult } from '@/app/api/quantitative/getPreOpenQualified/route';

export default function TradingViewWidget({ stock_code, quantitativeResult, markerDate }: { stock_code: string, quantitativeResult: PreOpenQualitiedResult, markerDate?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);

    const [stockData, setStockData] = React.useState<StockData>({
        stock_code: '',
        stock_name: '',
        price: 0,
        open: 0,
        high: 0,
        low: 0,
        percent_change: 0,
        pre_close: 0,
        quantity_ratio: 0,
        float_share: 0,
        float_cap: 0,
        pe_ratio: 0,
        industry: '',
        area: ''
    });

    const [stockDayPrice, setStockDayPrice] = React.useState<StockDayPrice[]>([])

    useEffect(
        () => {
            if (containerRef.current === null || tooltipRef.current === null) {
                return;
            }


            const chartOptions = {
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight, layout: { textColor: 'black', background: { type: ColorType.Solid, color: 'white' } }
            };
            const chartElement = document.createElement('div');
            const chart = createChart(chartElement, chartOptions);
            containerRef.current.appendChild(chartElement);

            const candlestickSeries = chart.addSeries(CandlestickSeries, {
                upColor: 'transparent', downColor: '#36965b', borderVisible: true, borderUpColor: "#ef5350", borderDownColor: '#36965b',
                wickUpColor: '#ef5350', wickDownColor: '#36965b',
            });

            //开盘价格线
            candlestickSeries.createPriceLine({
                price: quantitativeResult.open,
                color: 'blue',
                lineWidth: 1,
                lineStyle: 0,
                axisLabelVisible: true,
            });

            //平均价格线
            candlestickSeries.createPriceLine({
                price: quantitativeResult.quantitativeResult.meaning_close_180days,
                color: 'red',
                lineWidth: 1,
                lineStyle: 0,
                axisLabelVisible: true,
            });

            //设置当日标记
            if (markerDate) {
                const seriesMarkers = createSeriesMarkers(
                    candlestickSeries,
                    [
                        {
                            color: 'red',
                            position: 'belowBar',
                            shape: 'arrowUp',
                            time: markerDate, // Replace with the appropriate date string in 'YYYY-MM-DD' format
                            text: "跳开" + ((quantitativeResult.open - quantitativeResult.pre_close) / quantitativeResult.pre_close * 100).toFixed(2) + '%'
                        },
                    ]
                );
            }

            const formatter = new Intl.DateTimeFormat('en-CA')
            const dayPrice = stockDayPrice.map((item) => ({
                time: formatter.format(new Date(item.trade_date)),
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close
            }));

            candlestickSeries.setData(dayPrice);

            const histogramSeries = chart.addSeries(HistogramSeries, {
                color: '#26a69a', priceFormat: {
                    type: 'volume',
                },
                priceScaleId: 'volume',
            });

            const volumeData = stockDayPrice.map((item) => ({
                time: formatter.format(new Date(item.trade_date)),
                value: item.volume,
                color: item.close - item.open > 0 ? '#ef5350' : '#36965b'
            }));

            histogramSeries.setData(volumeData);
            chart.priceScale('volume').applyOptions({
                scaleMargins: {
                    top: 0.9,    // 占据底部 20%
                    bottom: 0,
                },
            });

            //tooltip逻辑
            chart.subscribeCrosshairMove((param) => {
                if (tooltipRef.current === null) {
                    return;
                }

                var tooltip = tooltipRef.current;
                if (!param.time || !param.seriesData.has(candlestickSeries)) {
                    tooltip.style.display = 'none';
                    return;
                }

                const data = param.seriesData.get(candlestickSeries) as CandlestickData<Time>;
                let i = stockDayPrice.findIndex(item => formatter.format(new Date(item.trade_date)) === param.time);
                let pre_close = stockDayPrice[i - 1]?.close || 0;

                // 计算涨跌幅
                const pct = ((data.close - pre_close) / pre_close * 100).toFixed(2) + '%';

                // 格式化日期（假设 time 是秒级时间戳）

                tooltip.innerHTML = `日期: ${param.time} 涨跌幅: ${pct}`;
                tooltip.style.display = 'block';

            });



            chart.timeScale().fitContent();
            return () => {
                chart.remove();
                if (containerRef.current) {
                    containerRef.current.removeChild(chartElement);
                }
            };
        },
        [containerRef.current, tooltipRef.current, stockData, stockDayPrice, markerDate, quantitativeResult]

    );

    useEffect(() => {
        async function fetchStockData() {
            try {
                const response = await fetch(`/api/stock/getStockDayPrice?stock_code=${stock_code}`);
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                const data = await response.json();
                setStockDayPrice(data.data);
                setStockData((prev) => ({
                    ...quantitativeResult
                }))
            } catch (error) {
                console.error('获取股票数据失败:', error);
            }
        }

        fetchStockData();
    }, [stock_code,markerDate]);

    return (
        <Box sx={{ position: 'relative' }}>
            <Typography ref={tooltipRef} variant='caption' sx={{ display: 'none', marginBottom: 1, marginTop: 1, position: 'absolute', left: 0, top: 0, zIndex: 100000 }}>{stockData.stock_name} [{stockData.stock_code}] 价格 {stockData.price} 涨幅 {stockData.percent_change}% <span style={{ fontWeight: 'bold' }}>流通市值 {stockData.float_cap}亿</span> 市盈率 {stockData.pe_ratio} </Typography>
            <Box ref={containerRef} sx={{ height: 'calc(50vh)', width: 'calc(50vw)' }} >
            </Box>
        </Box>

    );
}