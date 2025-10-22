import { RowDataPacket } from 'mysql2';
export default interface THSIndustryDayPrice extends RowDataPacket {
    industry_code: string; 
    industry_name: string;
    trade_date: string; 
    open: number; 
    close: number; 
    high: number; 
    low: number; 
    pre_close: number; 
    volume: number;
    created_at: string; 
}