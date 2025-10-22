// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { THSIndustry } from '@/lib/THSIndustry';
import THSIndustryDayPrice from '@/lib/THSIndustryDayPrice';
import { Candlestick } from '@/components/TradingViewWidget_v2';

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


export interface GetIndustryDayPriceResponse {
    data: Candlestick[]
}
export async function GET(req: NextRequest) {
    const industry_code = req.nextUrl.searchParams.get('ths_industry_code');
    if (!industry_code) {
        return new NextResponse('缺少参数 industry_code', { status: 400 });
    }

    const formatter = new Intl.DateTimeFormat('en-CA')

    let query = 'SELECT * FROM ths_industry_day_price WHERE industry_code = ?';
    const ret: GetIndustryDayPriceResponse = {
        data: []
    }
    try {
        const [data] = await pool.query<THSIndustryDayPrice[]>(query, [industry_code]);

        ret.data = data.map(item => ({
            time: formatter.format(new Date( item.trade_date)),
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume
            }));
    return NextResponse.json({ ...ret });
} catch (error) {
    console.error('DB error:', error);
    return new NextResponse('数据库查询失败', { status: 500 });
}
}