'use client'
import { Box, Button, Container, Typography } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
// TradingViewWidget.jsx
import React, { useEffect, useRef, memo } from 'react';
import { PreOpenQualitiedResult } from '../api/quantitative/getPreOpenQualified/route';
import TradingViewWidget from '@/components/TradingViewWidget';
import dayjs, { Dayjs } from 'dayjs';
import { TimeRangeBacktraceResult } from '../api/quantitative/getTimeRageBacktraceResults/route';



export default function Home() {
    const [timerangeBacktrace, setTimerangeBacktrace] = React.useState<TimeRangeBacktraceResult[]>([]);
    const [totalOverallReward, setTotalOverallReward] = React.useState<number>(0);
    const [averageReward, setAverageReward] = React.useState<number>(0);
    useEffect(() => {

        async function fetchQualifiedStocks() {
            try {
                const response = await fetch('/api/quantitative/getTimeRageBacktraceResults?start=20250401&end=20250831');
                if (!response.ok) {
                    throw new Error('网络响应错误');
                }
                const data = await response.json();
                let result = data.data as TimeRangeBacktraceResult[];
                setTimerangeBacktrace(result);
                setTotalOverallReward(data.overall_reward);
                setAverageReward(data.average_reward);
            } catch (error) {
                console.error('获取符合条件的股票失败:', error);
            }
        }

        fetchQualifiedStocks();
    }, []);

    return (
        <Container >

            <Typography variant='h4' sx={{ marginBottom: 2, marginTop: 2 }}>总体收益率: {totalOverallReward}% 平均收益率: {averageReward}%</Typography>
            <Box sx={{ display: 'flex' }}>

            </Box>
            {
                timerangeBacktrace.length > 0 ? (
                    <Box sx={{ marginBottom: 2 }}>
                        {timerangeBacktrace.map((timerangeResults) => (
                            <Box>
                                <Typography key={timerangeResults.trade_date} variant='h5' sx={{ marginTop: 2, marginBottom: 2, color: timerangeResults.overall_reward > 0 ? 'red' : 'green' }}>
                                    回溯日期: {timerangeResults.trade_date} 涨停数量: {timerangeResults.close_at_limit_high_count} 整体收益率: {timerangeResults.overall_reward}%
                                </Typography>
                                {timerangeResults.results.map((stock) => (
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

                                    <TradingViewWidget stock_code={stock.stock_code} quantitativeResult={stock} markerDate={dayjs(timerangeResults.trade_date).format("YYYY-MM-DD")} />
                                </Box>
                            ))}
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

