// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import StockDayPrice from '@/lib/StockDayPrice';
import StockData from '@/lib/StockData';
import modelAOptimized, { ModelAResult } from '@/lib/ModelA';


export interface PreOpenQualitiedResult extends StockData {
    open_percent: number; // 百分比字符串
    score: number; // 综合评分
    quantitativeResult: ModelAResult
}

function isValidRealDate(str: string): boolean {
    if (!/^\d{8}$/.test(str)) return false;

    const year = parseInt(str.slice(0, 4), 10);
    const month = parseInt(str.slice(4, 6), 10) - 1; // JS 中月份是 0-11
    const day = parseInt(str.slice(6, 8), 10);

    const date = new Date(year, month, day);

    return (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
    );
}

export interface TimeRangeBacktraceResult {
    trade_date: string; // 交易日期
    results: PreOpenQualitiedResult[]; // 符合条件的股票列表
    close_at_limit_high_count: number; // 涨停数量
    overall_reward: number; // 整体收益率
}

export async function GET(req: NextRequest) {

    //将指定日期范围内的交易日数据进行回溯
    //回测方法为：选取出每日前5的股票，计算当日涨停概率，以及当日的整体收益率
    const start_date = new Date("2025-06-01");
    let results: TimeRangeBacktraceResult[] = [];
    let time_range_rewards = 0;
    
    for (let d = new Date(start_date); d <= new Date("2025-06-31"); d.setDate(d.getDate() + 1)) {
        const trade_date = d.toISOString().split('T')[0].replace(/-/g, '');
        console.log(trade_date);

        try {
            const [stocksOfSelectedDay] = (await pool.query('SELECT * FROM stock_day_price WHERE trade_date = ?', [trade_date]));
            let result: PreOpenQualitiedResult[] = []
            for (const stockDayPriceOfSelectedDay of stocksOfSelectedDay as StockDayPrice[]) {
                let stockInfoResults = ((await pool.query('SELECT * FROM stock_data WHERE stock_code = ?', [stockDayPriceOfSelectedDay.stock_code]))[0] as StockData[]);
                if (stockInfoResults.length === 0) {
                    continue; // 如果没有找到股票信息，则跳过
                }
                let stockInfo = stockInfoResults[0]; // 获取第一个元素，因为查询结果是数组
                if (stockInfo.stock_name.indexOf('ST') !== -1 || stockInfo.stock_name.indexOf('退') !== -1 || stockInfo.stock_name.indexOf('*ST') !== -1) {
                    continue;
                }
                if (!stockInfo.stock_code.startsWith("600") && !stockInfo.stock_code.startsWith("601") && !stockInfo.stock_code.startsWith("603") && !stockInfo.stock_code.startsWith("605")
                    && !stockInfo.stock_code.startsWith("000") && !stockInfo.stock_code.startsWith("001") && !stockInfo.stock_code.startsWith("002")) {
                    continue;
                }

                let open_percent = (stockDayPriceOfSelectedDay.open - stockDayPriceOfSelectedDay.pre_close) / stockDayPriceOfSelectedDay.pre_close * 100
                //高开大于2%小于5%
                if (open_percent > 2 && open_percent < 5) {
                    const historyDayPrices = (await pool.query('SELECT * FROM stock_day_price WHERE stock_code = ? AND trade_date < ?', [stockInfo.stock_code, trade_date]))[0] as StockDayPrice[];

                    //市值大于30亿
                    if (stockInfo.float_cap < 30) {
                        continue; // 如果市值小于30亿，则跳过
                    }

                    let quantitativeResult = modelAOptimized(historyDayPrices as StockDayPrice[], stockDayPriceOfSelectedDay.open);
                    let score = 0;
                    //近90日压力K线数量
                    if (quantitativeResult.higher_than_today_open_90days < 10) {
                    score += 10 *((10 - quantitativeResult.higher_than_today_open_90days) / 10);
                    }
                    //近180日压力K线数量
                    if (quantitativeResult.higher_than_today_open_180days < 15) {
                    score += 15*((15 - quantitativeResult.higher_than_today_open_180days)  / 15);
                    }
                    //近270日压力K线数量
                    if (quantitativeResult.higher_than_today_open_270days < 20) {
                    score += 20 * ((20 - quantitativeResult.higher_than_today_open_270days) / 20);
                    }
                    //近7日累计涨幅
                    if (quantitativeResult.float_ratio_7days < 12) {
                    score += 5  * ((12 - quantitativeResult.float_ratio_7days) / 12);
                    }
                    //近15日累计涨幅
                    if (quantitativeResult.float_ratio_15days < 18) {
                    score += 12 * ((18 - quantitativeResult.float_ratio_15days) / 18);
                    }
                    //近30日累计涨幅
                    if (quantitativeResult.float_ratio_30days < 25) {
                    score += 13 * ((25 - quantitativeResult.float_ratio_30days) / 25);
                    }
                    //180日平均价格偏移幅度
                    if (quantitativeResult.meaning_difference_ratio_180days <10 && quantitativeResult.meaning_difference_ratio_180days > 0) {
                    score += 25 * ((10 - quantitativeResult.meaning_difference_ratio_180days) / 10);
                    }

                    if (quantitativeResult.meaning_difference_ratio_180days > 20 ){
                        continue;
                    }

                    if (quantitativeResult.higher_than_today_open_180days > 10) {
                        continue
                    }


                    result.push({
                        ...stockInfo,
                        pre_close: stockDayPriceOfSelectedDay.pre_close,
                        open: stockDayPriceOfSelectedDay.open,
                        price: stockDayPriceOfSelectedDay.close,
                        high: stockDayPriceOfSelectedDay.high,
                        low: stockDayPriceOfSelectedDay.low,
                        quantity_ratio: 0,
                        percent_change: parseFloat(((stockDayPriceOfSelectedDay.close - stockDayPriceOfSelectedDay.pre_close) / stockDayPriceOfSelectedDay.pre_close * 100).toFixed(2)),
                        open_percent: open_percent,
                        score: score,
                        quantitativeResult: quantitativeResult
                    });
                }
                
            }
            if (result.length != 0){
                results.push({
                    trade_date: trade_date,
                    results: result,
                    close_at_limit_high_count: 0,
                    overall_reward: 0
                });
            }

        } catch (error) {
            console.error('DB error:', error);
            return new NextResponse('数据库查询失败', { status: 500 });
        }

        
    }
    results = results.map(result=>{
        result.results.sort((a, b) => b.score - a.score); // 按照 score 降序排序
        result.results = result.results.slice(0, 5); // 取前5名
        if (result.results.length === 0) {
            return result; // 如果没有符合条件的股票，则返回空结果
        }

        let close_at_limit_high_count = 0;
        let overall_reward = 0;
        close_at_limit_high_count = result.results.filter(item => item.price === parseFloat((item.pre_close*1.1).toFixed(2))).length; // 计算涨停数量
        overall_reward = result.results.reduce((sum, item) => sum + item.percent_change -item.open_percent , 0) / result.results.length; // 计算整体收益率
        result.close_at_limit_high_count = close_at_limit_high_count;
        result.overall_reward = parseFloat(overall_reward.toFixed(2)); // 保留两位小数
        time_range_rewards += overall_reward;
        return result;
    })
    return NextResponse.json({overall_reward:time_range_rewards, average_reward: time_range_rewards / results.length,  data: results });


}