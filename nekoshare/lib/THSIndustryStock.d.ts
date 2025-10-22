import { RowDataPacket } from 'mysql2';
export default interface THSIndustryStock extends RowDataPacket {
    industry_code: string;
    stock_code: string;
    stock_name: string; 
}