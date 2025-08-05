/*
CREATE TABLE stock_data (
    stock_code VARCHAR(20) PRIMARY KEY COMMENT '股票的纯数字代码，如601881',
    stock_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '股票的名称，如中国银河',
    price DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '当前价格，单位为元',
    `open` DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '开盘价，单位为元',
    high DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '最高价，单位为元',
    low DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '最低价，单位为元',
    percent_change DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT '涨跌幅，单位为百分比',
    pre_close DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '前一日收盘价，单位为元',
    quantity_ratio DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT '量比，单位为百分比',
    float_share DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '流通股本，单位为股',
    float_cap DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '流通市值，单位为元',
    pe_ratio DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '市盈率',
    industry VARCHAR(50) NOT NULL DEFAULT '' COMMENT '行业分类',
    area VARCHAR(50) NOT NULL DEFAULT '' COMMENT '地区分类'
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
*/
export default interface StockData {
    stock_code: string; // 股票的纯数字代码，如601881
    stock_name: string; // 股票的名称，如中国银河
    price: number; // 当前价格，单位为元
    open: number; // 开盘价，单位为元
    high: number; // 最高价，单位为元
    low: number; // 最低价，单位为元
    percent_change: number; // 涨跌幅，单位为百分比
    pre_close: number; // 前一日收盘价，单位为元
    quantity_ratio: number; // 量比，单位为百分比
    float_share: number; // 流通股本，单位为股
    float_cap: number; // 流通市值，单位为元
    pe_ratio: number; // 市盈率
    industry: string; // 行业分类
    area: string; // 地区分类
}