'use client'
import StockData from '@/lib/StockData';
import StockDayPrice from '@/lib/StockDayPrice';
import { Box, Container, IconButton, SvgIcon, Typography } from '@mui/material';
import { AreaSeries, CandlestickSeries, createChart, ColorType, HistogramSeries, createSeriesMarkers, CandlestickData, Time, PriceScaleMode, CrosshairMode, LineStyle, ChartOptions, ChartOptionsBase, LayoutOptions, DeepPartial, LineWidth, IChartApi, ISeriesApi, LineSeries, SeriesMarker, LineType, AreaData } from 'lightweight-charts';
import React, { useEffect, useRef, memo, useState } from 'react';
import { PreOpenQualitiedResult } from '@/app/api/quantitative/getPreOpenQualified/route';
import { RectangleDrawingTool } from './plugins/plugins/rectangle-drawing-tool/rectangle-drawing-tool';
import RectangleButton from './RectangleButton';
import HorizontalLineButton from './HorizontalLineButton';
import TrendLineButton, { TrendLineDrawingTool } from './TrendLineButton';
import DrawingTool from './DrawingTool';
import PressurePoint from '@/lib/PressurePoint';

export interface Candlestick {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

interface MoveAverage {
    time: string;
    value: number;
}

interface Point {
    time: Time;
    price: number;
}

export interface RectangleRegion {
    pointA: Point
    pointB: Point
}

export interface TrendLine {
    startPoint: Point;
    endPoint: Point;
}

export interface TradingViewWidgetProps {
    candlesticks: Candlestick[];
    rectangles: RectangleRegion[];
    trendLines?: TrendLine[];
    pressurePoints?: PressurePoint[];
    highlightDate?: string;
    enableMAHighlight?: boolean;
    from?: string;
    to?: string;
}


/* 
TODO: https://tradingview.github.io/lightweight-charts/tutorials/customization/data-points 标记指定区间的K线，
https://tradingview.github.io/lightweight-charts/tutorials/how_to/price-line 价格线标记上下区间

https://tradingview.github.io/lightweight-charts/plugin-examples/ 趋势线与箱体
*/

export default function TradingViewWidget({ candlesticks, rectangles, trendLines, pressurePoints, highlightDate, enableMAHighlight, from, to }: TradingViewWidgetProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const [chartApi, setChartApi] = useState<IChartApi | null>(null)
    const [seriesApi, setSeriesApi] = useState<ISeriesApi<'Candlestick'> | null>(null);

    function calculateMA(data: Candlestick[], n: number): MoveAverage[] {
        const result = [];
        // 用于存储近n日的价格
        const chunk = [];
        for (let i = 0; i < data.length; i++) {
            let sum = 0;
            chunk.push(data[i].close)
            if (chunk.length > n) {
                chunk.shift();
            }
            sum = chunk.reduce((acc, cur) => acc + cur, 0);
            sum = sum / chunk.length;
            result.push({ time: data[i].time, value: sum });
        }
        return result;
    }
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

            const chartOptions: DeepPartial<ChartOptions> = {
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight,
                layout: { textColor: 'white', background: { type: ColorType.Solid, color: '#222' } },
                grid: {
                    vertLines: { color: '#2c2c2c' },
                    horzLines: { color: '#2c2c2c' },
                },
                crosshair: {
                    // Change mode from default 'magnet' to 'normal'.
                    // Allows the crosshair to move freely without snapping to datapoints
                    mode: CrosshairMode.Normal,

                    // Vertical crosshair line (showing Date in Label)
                    vertLine: {
                        // width: 8 as LineWidth,
                        // color: '#C3BCDB44',
                        // style: LineStyle.Solid,
                        color: '#25509f',
                        labelBackgroundColor: '#25509f',
                    },

                    // Horizontal crosshair line (showing Price in Label)
                    horzLine: {
                        color: '#25509f',
                        labelBackgroundColor: '#25509f',
                    },
                },
            };


            const chartElement = document.createElement('div');
            const chart = createChart(chartElement, chartOptions);
            containerRef.current.appendChild(chartElement);
            setChartApi(chart);

            const ma5Data = calculateMA(candlesticks, 5);
            const ma10Data = calculateMA(candlesticks, 10);

            if (enableMAHighlight) {
                const areaData: ({
                    time: string;
                    value: number;
                    topColor?: string;
                    bottomColor?: string;
                    lineColor?: string;
                })[] = []
                for (let i = 0; i < ma5Data.length; ++i) {
                    if (ma5Data[i].value > ma10Data[i].value && candlesticks[i].close > ma5Data[i].value) {
                        areaData.push({
                            time: candlesticks[i].time,
                            value: candlesticks[i].close,
                            topColor: 'rgba(235, 20, 20, 0.6)',
                            bottomColor: 'rgba(202, 40, 0, 0.1)',
                        })
                    } else {
                        if (areaData.length > 0) {
                            areaData[areaData.length - 1].topColor = 'transparent'
                            areaData[areaData.length - 1].bottomColor = 'transparent'
                        }
                        areaData.push({
                            time: candlesticks[i].time,
                            value: candlesticks[i].close,
                            topColor: 'transparent',
                            bottomColor: 'transparent',
                        })
                    }
                }
                console.log(areaData)
                console.log(candlesticks)
                chart.addSeries(AreaSeries, {
                    lastValueVisible: false,
                    crosshairMarkerVisible: false,
                    lineColor: 'transparent',
                    topColor: 'rgba(56, 33, 110,0.6)',
                    bottomColor: 'rgba(56, 33, 110, 0.1)',
                }).setData(areaData)
            }

            // 蜡烛图series
            const candlestickSeries = chart.addSeries(CandlestickSeries, {
                upColor: 'transparent',
                downColor: '#0093ad',
                borderVisible: true,
                borderUpColor: "#ff0400",
                borderDownColor: '#0093ad',
                wickUpColor: '#ff0400',
                wickDownColor: '#0093ad',
            });
            setSeriesApi(candlestickSeries);
            candlestickSeries.priceScale().applyOptions({
                mode: PriceScaleMode.Logarithmic
            })

            const formatter = new Intl.DateTimeFormat('en-CA')
            const dayPrice = candlesticks.map((item) => ({
                time: item.time,
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
                borderColor: highlightDate === item.time ? '#e2d628' : undefined,
                wickColor: highlightDate === item.time ? '#e2d628' : undefined,
            }));

            candlestickSeries.setData(dayPrice);

            // 成交量series
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
                color: highlightDate === item.time ? '#e2d628' : item.close - item.open > 0 ? '#ec3a37' : '#0093ad',
            }));

            histogramSeries.setData(volumeData);
            chart.priceScale('volume').applyOptions({
                scaleMargins: {
                    top: 0.9,    // 占据底部 20%
                    bottom: 0,
                },
            });



            // 5日线型图series
            const ma5Series = chart.addSeries(LineSeries, {
                color: '#ff0400',
                lineWidth: 1,
                priceLineWidth: 1,
                priceLineStyle: LineStyle.Solid,
                crosshairMarkerVisible: false,
                priceLineVisible: false,
            });

            ma5Series.setData(ma5Data);

            // 10日线型图series
            const ma10Series = chart.addSeries(LineSeries, {
                color: '#ffd000',
                lineWidth: 1,
                priceLineWidth: 1,
                priceLineStyle: LineStyle.Solid,
                crosshairMarkerVisible: false,
                priceLineVisible: false,
            });

            ma10Series.setData(ma10Data);

            // 压力位标注：priceLine + seriesMarker
            const makers: SeriesMarker<Time>[] = []
            if (pressurePoints) {
                for (let pressurePoint of pressurePoints) {
                    const priceLine = candlestickSeries.createPriceLine({
                        price: pressurePoint.price,
                        color: '#ff0400',
                        lineWidth: 1,
                        lineStyle: LineStyle.Dashed,
                        axisLabelVisible: true,
                        title: `压力位 ${pressurePoint.trade_date}`,
                    });
                    makers.push({
                        time: pressurePoint.trade_date,
                        position: 'aboveBar',
                        color: '#f61010',
                        shape: 'circle',
                        text: 'P',
                    });
                }
                createSeriesMarkers<Time>(candlestickSeries, makers);
            }
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

            chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, dayPrice.length - suitableNum), to: dayPrice.length - 1 });

            if (highlightDate !== undefined) {
                let index = dayPrice.findIndex(p => p.time === highlightDate);
                if (index !== -1) {
                    chart.timeScale().setVisibleLogicalRange({ from: Math.max(0, index - suitableNum), to: index });
                }
            }

            containerRef.current.onresize = () => {
                chart.applyOptions({ width: containerRef.current!.clientWidth, height: containerRef.current!.clientHeight });
            }

            const drawingToolElement = document.querySelector<HTMLDivElement>("#drawing-tool")
            if (drawingToolElement !== null) {
                const rectangleDrawingTool = new RectangleDrawingTool(chart, candlestickSeries, document.querySelector<HTMLDivElement>("#drawing-tool")!, { showLabels: false })
                for (let rectangle of rectangles) {
                    rectangleDrawingTool.addNewRectangle(rectangle.pointA, rectangle.pointB)
                }

                // const trendLineDrawingTool = new TrendLineDrawingTool(chart, candlestickSeries, ()=>{}, { showLabels: false });
                // console.log('trendLines', trendLines);
                // if (trendLines) {
                //     for (let trendLine of trendLines) {
                //         trendLineDrawingTool.addNewTrendLine(trendLine.startPoint, trendLine.endPoint)
                //     }
                // }
                const trendLineDrawingTool = new TrendLineDrawingTool(chart, candlestickSeries, () => { }, { showLabels: false });
                if (trendLines) {
                    for (let trendLine of trendLines) {
                        trendLineDrawingTool.addNewTrendLine(trendLine.startPoint, trendLine.endPoint)
                    }
                }

            }

            if (from !== undefined && to !== undefined) {
                chart.timeScale().setVisibleRange({ from: from, to: to })
            }



            console.log(chart, candlestickSeries)

            return () => {
                console.log('cleanup chart');
                chart.remove();
                if (containerRef.current) {
                    containerRef.current.removeChild(chartElement);
                    containerRef.current.onresize = null;
                }



            };
        },
        [containerRef.current, candlesticks, trendLines, highlightDate, enableMAHighlight]

    );


    return (
        <Box sx={{ position: 'relative', height: '100%', width: '100%', display: 'flex', flexDirection: 'column' }}>
            {
                chartApi !== null && seriesApi !== null && <DrawingTool chart={chartApi} series={seriesApi} />
            }
            {
                (chartApi === null || seriesApi === null) && (
                    <IconButton sx={{ borderBottom: '1px white solid', visibility: 'hidden' }} >
                        <SvgIcon>
                            <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="13599" width="24" height="24"><path d="M870.4 204.8a51.2 51.2 0 0 1 51.2 51.2v512a51.2 51.2 0 0 1-51.2 51.2H153.6a51.2 51.2 0 0 1-51.2-51.2V256a51.2 51.2 0 0 1 51.2-51.2h716.8z m-25.6 76.8h-665.6v460.8h665.6v-460.8z" fill='#000000' p-id="13600"></path><path d="M153.6 153.6a102.4 102.4 0 1 1 0 204.8 102.4 102.4 0 0 1 0-204.8z m0 51.2a51.2 51.2 0 1 0 0 102.4 51.2 51.2 0 0 0 0-102.4z" fill='#000000' p-id="13601"></path><path d="M153.6 204.8a51.2 51.2 0 1 0 0 102.4 51.2 51.2 0 0 0 0-102.4z" fill='#000000' p-id="13602"></path><path d="M870.4 665.6a102.4 102.4 0 1 1 0 204.8 102.4 102.4 0 0 1 0-204.8z m0 51.2a51.2 51.2 0 1 0 0 102.4 51.2 51.2 0 0 0 0-102.4z" fill='#000000' p-id="13603"></path><path d="M870.4 716.8a51.2 51.2 0 1 0 0 102.4 51.2 51.2 0 0 0 0-102.4z" fill='#000000' p-id="13604"></path></svg>
                        </SvgIcon>
                    </IconButton>
                )
            }
            <Typography ref={tooltipRef} variant='caption' sx={{ display: 'none', margin: '8px 8px', position: 'absolute', right: 0, top: 0, zIndex: 100000 }} />
            <Box ref={containerRef} sx={{ flexGrow: 1, width: '100%', height: '' }} >
            </Box>
        </Box>

    );
}