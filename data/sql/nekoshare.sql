CREATE DATABASE nekoshare;

USE nekoshare;

-- 股票基本信息
CREATE TABLE stock_data (
    stock_code VARCHAR(20) PRIMARY KEY COMMENT '股票的纯数字代码，如601881',
    stock_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '股票的名称，如中国银河',
    price DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '当前价格，单位为元',
    `open` DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '开盘价，单位为元',
    high DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '最高价，单位为元',
    low DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '最低价，单位为元',
    percent_change DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT '涨跌幅，单位为百分比',
    pre_close DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '前一日收盘价，单位为元',
    quantity_ratio DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '量比，单位为百分比',
    float_share DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '流通股本，单位为股',
    float_cap DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '流通市值，单位为元',
    pe_ratio DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '市盈率',
    industry VARCHAR(50) NOT NULL DEFAULT '' COMMENT '行业分类',
    area VARCHAR(50) NOT NULL DEFAULT '' COMMENT '地区分类'
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 股票日线数据
CREATE TABLE stock_day_price (
    stock_code VARCHAR(20) NOT NULL COMMENT '股票的纯数字代码，如601881',
    stock_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '股票的名称，如中国银河',
    trade_date DATE NOT NULL COMMENT '记录日期，格式为YYYY-MM-DD',
    `open` DECIMAL(10, 2) NOT NULL COMMENT '开盘价',
    `close` DECIMAL(10, 2) NOT NULL COMMENT '收盘价',
    high DECIMAL(10, 2) NOT NULL COMMENT '最高价',
    low DECIMAL(10, 2) NOT NULL  COMMENT '最低价',
    pre_close DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '前一日收盘价',
    volume bigint NOT NULL DEFAULT 0 COMMENT '成交量，单位为股',
    amount DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '成交额，单位为元',
    close_at_limit_high TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否涨停，1表示是，0表示否',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    PRIMARY KEY(stock_code, trade_date) COMMENT '索引：股票代码和交易日期组合索引，用于快速查询特定股票在某个日期的价格记录'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
