// app/api/users/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';
import StockDayPrice from '@/lib/StockDayPrice';
import StockData from '@/lib/StockData';
import modelAOptimized, { ModelAResult } from '@/lib/ModelA';


export interface PreOpenQualitiedResult extends StockData {
  open_percent: number; // 百分比字符串
  score: number; // 综合评分
  quantitativeResult: ModelAResult
}



export async function GET() {
  try {
    const [preOpenQuotes] = (await pool.query('SELECT * FROM stock_data'));
    let result: PreOpenQualitiedResult[] = []
    for (const quote of preOpenQuotes as StockData[]) {

      if (quote.stock_name.indexOf('ST') !== -1 || quote.stock_name.indexOf('退') !== -1 || quote.stock_name.indexOf('*ST') !== -1) {
        continue;
      }

      if (!quote.stock_code.startsWith("600") && !quote.stock_code.startsWith("601") && !quote.stock_code.startsWith("603") && !quote.stock_code.startsWith("605")
        && !quote.stock_code.startsWith("000") && !quote.stock_code.startsWith("001") && !quote.stock_code.startsWith("002")) {
        continue;
      }

      let open_percent = (quote.open - quote.pre_close) / quote.pre_close * 100
      //高开大于2%小于5%
      if (open_percent > 2 && open_percent < 5) {
        const [rows] = await pool.query('SELECT * FROM stock_day_price WHERE stock_code = ?', [quote.stock_code]);

        let historyDayPrices = (rows as StockDayPrice[]).slice(0, -1);
        //市值大于30亿
        if (quote.float_cap < 30) {
          continue; // 如果市值小于30亿，则跳过
        }

        let quantitativeResult = modelAOptimized(historyDayPrices as StockDayPrice[], quote.open);
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
          ...quote,
          stock_code: quote.stock_code,
          stock_name: quote.stock_name,
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