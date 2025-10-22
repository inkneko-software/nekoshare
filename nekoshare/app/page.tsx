'use client'
import StockData from '@/lib/StockData';
import StockDayPrice from '@/lib/StockDayPrice';
import { Box, Container, Typography } from '@mui/material';
import { AreaSeries, CandlestickSeries, createChart, ColorType, HistogramSeries } from 'lightweight-charts';
// TradingViewWidget.jsx
import React, { useEffect, useRef, memo } from 'react';
import { PreOpenQualitiedResult } from './api/quantitative/getPreOpenQualified/route';
import TradingViewWidget from '@/components/TradingViewWidget';

export default function Home() {
    const [qualifiedStocks, setQualifiedStocks] = React.useState<PreOpenQualitiedResult[]>([]);


    useEffect(() => {

        async function fetchQualifiedStocks() {
            try {
                const response = await fetch('/api/quantitative/getPreOpenQualified');
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                const data = await response.json();
                let result = data.data as PreOpenQualitiedResult[];
                result.sort((a, b) => b.score - a.score);
                setQualifiedStocks(data.data);
            } catch (error) {
                console.error('获取符合条件的股票失败:', error);
            }
        }

        fetchQualifiedStocks();
    }, []);

    return (
        <Container >
            <Typography variant='h4' sx={{ marginBottom: 2, marginTop: 2 }}>开盘前符合条件: {qualifiedStocks.length}</Typography>
            <Typography variant='body1' sx={{ marginBottom: 2 }}>
                经验之谈：控仓，一定要给自己补一倍仓的机会，因为有时候当天被套8%以上，需要补仓等三日内解套<br/>
                70°加速的票不要买，短期累计的获利盘较高容易砸盘，同时注意N字结构<br/>
                历史新高的票不要买，容易冲高回落<br/>
                开的距离前面压力位高于2%的也要小心，最好是开在压力位上面0%-1%之间<br/>
                减持、财报数据很重要，一定要注意

            </Typography>
            {
                qualifiedStocks.length > 0 ? (
                    <Box sx={{ marginBottom: 2 }}>
                        {qualifiedStocks.map((stock) => (
                            <Box key={stock.stock_code} sx={{ marginBottom: 1 }}>
                                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                    <Typography variant='caption'>{stock.stock_name} [{stock.stock_code}] 价格 {stock.price} 涨幅 {stock.percent_change}% 量比 {stock.quantity_ratio} <span style={{ fontWeight: 'bold' }}>流通市值 {stock.float_cap}亿</span> 市盈率 {stock.pe_ratio}  {stock.area} {stock.industry} </Typography>

                                    <Typography variant='caption'>昨收 {stock.pre_close} <span style={{ color: 'blue' }}> 开盘价 {stock.open} 高开幅度: {((stock.open - stock.pre_close) / stock.pre_close * 100).toFixed(2)}%</span> 最高价 {stock.high} 最低价 {stock.low} </Typography>
                                    <Box sx={{ display: 'flex' }}>
                                        <Typography variant='caption' sx={{ marginRight: 1 }}>评分: {stock.score.toFixed(2)} </Typography>
                                        {/* 如果收盘收益大于0，则显示红色，否则显示绿色 */}
                                        <Typography variant='caption' sx={{ color: stock.percent_change - stock.open_percent > 0 ? 'red' : 'green' }} >收盘收益：{(stock.percent_change - stock.open_percent).toFixed(2)}%</Typography>
                                        {stock.price === Math.round(stock.pre_close * 1.1)}
                                    </Box>
                                    <Typography variant='caption'>近90日压力K线数量: {stock.quantitativeResult.higher_than_today_open_90days} 近180日压力K线数量: {stock.quantitativeResult.higher_than_today_open_180days} 近270日压力K线数量: {stock.quantitativeResult.higher_than_today_open_270days}</Typography>


                                    <Typography variant='caption'>近7日累计涨幅: {stock.quantitativeResult.float_ratio_7days.toFixed(2)}% 近15日累计涨幅: {stock.quantitativeResult.float_ratio_15days.toFixed(2)}% 近30日累计涨幅: {stock.quantitativeResult.float_ratio_30days.toFixed(2)}%</Typography>
                                    <Typography variant='caption'>180日平均价格偏移幅度: {stock.quantitativeResult.meaning_difference_ratio_180days.toFixed(2)}% <span style={{ color: "red" }}>180日平均价格: {stock.quantitativeResult.meaning_close_180days.toFixed(2)} </span></Typography>
                                </Box>

                                <TradingViewWidget stock_code={stock.stock_code} quantitativeResult={stock} />
                            </Box>
                        ))}
                    </Box>
                ) : (
                    <Typography variant='body1'>没有符合条件的股票</Typography>
                )
            }
        </Container>
    )
}

