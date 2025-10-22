// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { RowDataPacket } from 'mysql2';
import StockDayPrice from '@/lib/StockDayPrice';

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
    const stockCode = req.nextUrl.searchParams.get('stock_code');
    const startDate = req.nextUrl.searchParams.get('start_date');
    const endDate = req.nextUrl.searchParams.get('end_date');

    if (!stockCode) {
        return new NextResponse('缺少股票代码参数', { status: 400 });
    }


    let query = 'SELECT * FROM stock_day_price WHERE stock_code = ?';
    let params: (string | number)[] = [stockCode];
    if (startDate && isValidRealDate(startDate)) {
        query += ' AND trade_date >= ?';
        params.push(startDate);
    }
    if (endDate && isValidRealDate(endDate)) {
        query += ' AND trade_date <= ?';
        params.push(endDate);
    }

    const formatter = new Intl.DateTimeFormat('en-CA')
    try {
        const [rows] = await pool.query<(StockDayPrice & RowDataPacket)[]>(query, params);
        return NextResponse.json({ data: rows.map(item => ({
            trade_date: formatter.format(new Date( item.trade_date)),
            open: item.open,
            high: item.high,
            low: item.low,
            close: item.close,
            volume: item.volume
        })) });
    } catch (error) {
        console.error('DB error:', error);
        return new NextResponse('数据库查询失败', { status: 500 });
    }
}