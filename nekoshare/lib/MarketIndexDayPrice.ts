export default interface MarketIndexDayPrice {
    code: string;
    name: string;
    trade_date: string;
    open: number;
    close: number;
    high: number;
    low: number;
    volume: number;
    amount: number;
}