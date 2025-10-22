// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { THSIndustry } from '@/lib/THSIndustry';
import THSIndustryDayPrice from '@/lib/THSIndustryDayPrice';
import StockDayPrice from '@/lib/StockDayPrice';
import THSIndustryStock from '@/lib/THSIndustryStock';
import StockData from '@/lib/StockData';
import { RowDataPacket } from 'mysql2';

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

export interface GetIndustryStocksResponse {
    stocks: StockData[]
}
export async function GET(req: NextRequest) {
    const industryCode = req.nextUrl.searchParams.get('ths_industry_code');
    // let query = 'SELECT * FROM stock_day_price WHERE stock_code = ?';
    // let params: (string | number)[] = [stockCode];
    // if (startDate && isValidRealDate(startDate)) {
    //     query += ' AND trade_date >= ?';
    //     params.push(startDate);
    // }
    // if (endDate && isValidRealDate(endDate)) {
    //     query += ' AND trade_date <= ?';
    //     params.push(endDate);
    // }

    // try {
    //     const [rows] = await pool.query(query, params);
    //     return NextResponse.json({ data: rows });
    // } catch (error) {
    //     console.error('DB error:', error);
    //     return new NextResponse('数据库查询失败', { status: 500 });
    // }

    let query = 'SELECT * FROM ths_industry_stock where industry_code = ?';
    const ret: GetIndustryStocksResponse  = {
        stocks: []
    }
    try {
        const [thsIndustryStocks] = await pool.query<THSIndustryStock[]>(query, [industryCode]);
        for (let stock of thsIndustryStocks) {
            let query2 = 'SELECT * FROM stock_data WHERE stock_code = ?';
            const [stockData] = await pool.query<(StockData & RowDataPacket)[]>(query2, [stock.stock_code]);
            if (stockData.length === 1) {
                ret.stocks.push(stockData[0]);
            }
            
        }
        ret.stocks.sort((a, b) => b.percent_change - a.percent_change);
        return NextResponse.json({ ...ret});
    } catch (error) {
        console.error('DB error:', error);
        return new NextResponse('数据库查询失败', { status: 500 });
    }
}