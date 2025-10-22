// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { THSIndustry } from '@/lib/THSIndustry';
import THSIndustryDayPrice from '@/lib/THSIndustryDayPrice';

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

export interface THSIndustryMarket {
    code: string;
    name: string;
    change_pct: number;
}

export interface GetIndustriesResponse {
    industries: THSIndustryMarket[]
}
export async function GET(req: NextRequest) {

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

    let query = 'SELECT code, name FROM ths_industry';
    const ret: GetIndustriesResponse  = {
        industries: []
    }
    try {
        const [thsIndustries] = await pool.query<THSIndustry[]>(query);
        for (let industry of thsIndustries) {
            let query2 = 'SELECT * FROM ths_industry_day_price WHERE industry_code = ? ORDER BY trade_date DESC LIMIT 1';
            const [industryDayPrices] = await pool.query<THSIndustryDayPrice[]>(query2, [industry.code]);
            if (industryDayPrices.length === 1) {
                ret.industries.push({
                    code: industry.code,
                    name: industry.name,
                    change_pct: parseFloat(((industryDayPrices[0].close - industryDayPrices[0].pre_close) / industryDayPrices[0].pre_close * 100).toFixed(2))
                });
            }
            
        }
        ret.industries.sort((a, b) => b.change_pct - a.change_pct);
        return NextResponse.json({ ...ret});
    } catch (error) {
        console.error('DB error:', error);
        return new NextResponse('数据库查询失败', { status: 500 });
    }
}