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


export async function GET(req: NextRequest) {

  const trade_date = req.nextUrl.searchParams.get('trade_date');

  if (!trade_date || !isValidRealDate(trade_date)) {
    return new NextResponse('缺少或无效的交易日期参数', { status: 400 });
  }

  try {
    const [stocksOfSelectedDay] = (await pool.query('SELECT * FROM stock_day_price WHERE trade_date = ?', [trade_date]));
    let result: PreOpenQualitiedResult[] = []
    for (const stockDayPriceOfSelectedDay of stocksOfSelectedDay as StockDayPrice[]) {
      let stockInfoResults =  ((await pool.query('SELECT * FROM stock_data WHERE stock_code = ?', [stockDayPriceOfSelectedDay.stock_code]))[0] as StockData[]);
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
        result.push({
          ...stockInfo,
          pre_close: stockDayPriceOfSelectedDay.pre_close,
          open: stockDayPriceOfSelectedDay.open,
          price: stockDayPriceOfSelectedDay.close,
          high: stockDayPriceOfSelectedDay.high,
          low: stockDayPriceOfSelectedDay.low,
          quantity_ratio: 0,
          percent_change: parseFloat(((stockDayPriceOfSelectedDay.close - stockDayPriceOfSelectedDay.pre_close) / stockDayPriceOfSelectedDay.pre_close * 100).toFixed(2)) ,
          open_percent: open_percent,
          score: score,
          quantitativeResult: quantitativeResult
        });
      }
    }
    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('DB error:', error);
    return new NextResponse('数据库查询失败', { status: 500 });
  }
}