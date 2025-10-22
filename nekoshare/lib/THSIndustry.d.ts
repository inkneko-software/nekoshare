import { RowDataPacket } from 'mysql2';
export interface THSIndustry extends RowDataPacket{
    code: string,
    name: string,
    change_pct: number

}