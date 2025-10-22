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
    percent_change DECIMAL(5, 2) NOT NULL DEFAULT 0 COMMENT '涨跌幅，单位为百分比',
    close_at_limit_high TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否涨停，1表示是，0表示否',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    PRIMARY KEY(stock_code, trade_date) COMMENT '索引：股票代码和交易日期组合索引，用于快速查询特定股票在某个日期的价格记录'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

--股票每日复权因子

CREATE TABLE stock_day_qfq(
    stock_code VARCHAR(20) NOT NULL COMMENT '股票的纯数字代码，如601881',
    trade_date DATE NOT NULL COMMENT '记录日期，格式为YYYY-MM-DD',
    adj_factor FLOAT NOT NULL COMMENT '复权因子',
    PRIMARY KEY(stock_code, trade_date)
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
-- 同花顺行业
CREATE TABLE ths_industry (
    code VARCHAR(20) PRIMARY KEY COMMENT '行业板块代码，如801010',
    name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '行业板块名称，如银行',
    UNIQUE(name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 同花顺行业成分股
CREATE TABLE ths_industry_stock(
    industry_code VARCHAR(20) NOT NULL COMMENT '行业板块代码，如801010',
    stock_code VARCHAR(20) NOT NULL COMMENT '股票的纯数字代码，如601881',
    stock_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '股票的名称，如中国银河',
    PRIMARY KEY(industry_code, stock_code) COMMENT '索引：行业板块代码和股票代码组合索引，用于快速查询某个行业板块下的所有成分股'
)ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 同花顺行业板块日线数据
CREATE TABLE ths_industry_day_price (
    industry_code VARCHAR(20) NOT NULL COMMENT '行业板块代码',
    industry_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '行业板块名称',
    trade_date DATE NOT NULL COMMENT '记录日期，格式为YYYY-MM-DD',
    `open` DECIMAL(10, 2) NOT NULL COMMENT '开盘价',
    `close` DECIMAL(10, 2) NOT NULL COMMENT '收盘价',
    high DECIMAL(10, 2) NOT NULL COMMENT '最高价',
    low DECIMAL(10, 2) NOT NULL  COMMENT '最低价',
    pre_close DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '前一日收盘价',
    volume bigint NOT NULL DEFAULT 0 COMMENT '成交量',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    PRIMARY KEY(industry_code, trade_date) COMMENT '索引：行业板块代码和交易日期组合索引，用于快速查询特定行业板块在某个日期的价格记录'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


CREATE TABLE strategy_backtrace_task (
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    strategy_name VARCHAR(100) NOT NULL COMMENT '策略名称',
    start_date DATE NOT NULL COMMENT '回测开始日期',
    end_date DATE NOT NULL COMMENT '回测结束日期',
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '任务状态，如PENDING, RUNNING, COMPLETED, FAILED',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '任务创建时间',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '任务最后更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;