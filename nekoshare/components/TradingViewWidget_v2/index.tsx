'use client'
import StockData from '@/lib/StockData';
import StockDayPrice from '@/lib/StockDayPrice';
import { Box, Container, Typography } from '@mui/material';
import { AreaSeries, CandlestickSeries, createChart, ColorType, HistogramSeries, createSeriesMarkers, CandlestickData, Time, PriceScaleMode } from 'lightweight-charts';
import React, { useEffect, useRef, memo } from 'react';
import { PreOpenQualitiedResult } from '@/app/api/quantitative/getPreOpenQualified/route';
import { RectangleDrawingTool } from './plugins/plugins/rectangle-drawing-tool/rectangle-drawing-tool';

export interface Candlestick{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface Point {
	time: Time;
	price: number;
}

export interface RectangleRegion {
    pointA: Point
    pointB: Point
}

export interface TradingViewWidgetProps{
    candlesticks: Candlestick[];
    rectangles: RectangleRegion[]
}


/* 
TODO: https://tradingview.github.io/lightweight-charts/tutorials/customization/data-points 标记指定区间的K线，
https://tradingview.github.io/lightweight-charts/tutorials/how_to/price-line 价格线标记上下区间

https://tradingview.github.io/lightweight-charts/plugin-examples/ 趋势线与箱体
*/

export default function TradingViewWidget({ candlesticks, rectangles }: TradingViewWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);


    useEffect(
        () => {
            if (containerRef.current === null || tooltipRef.current === null) {
                console.log('containerRef or tooltipRef is null');
                return;
            }

            if (candlesticks.length === 0) {
                console.log('candlesticks is empty');
                return;
            }

            const chartOptions = {
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight,
                 layout: { textColor: 'white', background: { type: ColorType.Solid, color: '#222' } },
                grid: {
                    vertLines: { color: '#2c2c2c' },
                    horzLines: { color: '#2c2c2c' },
                },
            };

            
            const chartElement = document.createElement('div');
            const chart = createChart(chartElement, chartOptions);
            containerRef.current.appendChild(chartElement);

            const candlestickSeries = chart.addSeries(CandlestickSeries, {
                upColor: 'transparent', downColor: '#0093ad', borderVisible: true, borderUpColor: "#ff0400", borderDownColor: '#0093ad',
                wickUpColor: '#ff0400', wickDownColor: '#0093ad',
            });
            candlestickSeries.priceScale().applyOptions({
                mode: PriceScaleMode.Logarithmic
            })

            const formatter = new Intl.DateTimeFormat('en-CA')
            const dayPrice = candlesticks.map((item) => ({
                time:item.time,
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close
            }));

            candlestickSeries.setData(dayPrice);

            const histogramSeries = chart.addSeries(HistogramSeries, {
                color: '#0093ad',
                priceFormat: {
                    type: 'volume',
                },
                priceScaleId: 'volume',
            });

            const volumeData = candlesticks.map((item) => ({
                time: item.time,
                value: item.volume,
                color: item.close - item.open > 0 ? '#ec3a37' : '#0093ad'
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
                let i = candlesticks.findIndex(item => item.time === param.time);
                let pre_close = candlesticks[i - 1]?.close || 0;

                // 计算涨跌幅
                const pct = ((data.close - pre_close) / pre_close * 100).toFixed(2) + '%';

                // 格式化日期（假设 time 是秒级时间戳）

                tooltip.innerHTML = `日期: ${param.time} 涨跌幅: ${pct}`;
                tooltip.style.display = 'block';

            });


            let suitableNum = Math.round(containerRef.current.clientWidth / 8)

            chart.timeScale().setVisibleLogicalRange({from: Math.max(0, dayPrice.length - suitableNum), to: dayPrice.length -1});

            containerRef.current.onresize = () => {
                chart.applyOptions({ width: containerRef.current!.clientWidth, height: containerRef.current!.clientHeight });
            }

            const drawingTool =  new RectangleDrawingTool(chart, candlestickSeries, document.querySelector<HTMLDivElement>("#drawing-tool")!, {showLabels: false})
            for(let rectangle of rectangles){
                drawingTool.addNewRectangle(rectangle.pointA, rectangle.pointB)
            }
            return () => {
                chart.remove();
                if (containerRef.current) {
                    containerRef.current.removeChild(chartElement);
                    containerRef.current.onresize = null;
                }
            };
        },
        [containerRef.current, candlesticks]

    );

    return (
        <Box sx={{ position: 'relative', height: '100%', width: '100%'  }}>
            <div id="drawing-tool" style={{display: 'none'}} />
            <Typography ref={tooltipRef} variant='caption' sx={{ display: 'none', marginBottom: 1, marginTop: 1, position: 'absolute', left: 0, top: 0, zIndex: 100000 }} />
            <Box ref={containerRef} sx={{ height: '100%', width: '100%' }} >
            </Box>
        </Box>

    );
}