// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import StockData from '@/lib/StockData';

export async function GET(req: NextRequest) {
  const stockCode = req.nextUrl.searchParams.get('stock_code');
  if (!stockCode) {
    return new NextResponse('缺少股票代码参数', { status: 400 });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM stock_data WHERE stock_code = ?', [stockCode]);
    if ((rows as any[]).length === 0) {
      return new NextResponse('未找到股票数据', { status: 404 });
    }
    return NextResponse.json({ ...(rows as any[])[0] });
  } catch (error) {
    console.error('DB error:', error);
    return new NextResponse('数据库查询失败', { status: 500 });
  }
}