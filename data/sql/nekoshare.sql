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
    percent_change DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '涨跌幅，单位为百分比',
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
    percent_change DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '涨跌幅，单位为百分比',
    close_at_limit_high TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否涨停，1表示是，0表示否',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '记录创建时间',
    PRIMARY KEY(stock_code, trade_date) COMMENT '索引：股票代码和交易日期组合索引，用于快速查询特定股票在某个日期的价格记录',
    INDEX idx_trade_date (trade_date)
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


-- CREATE TABLE strategy_backtrace_task (
--     id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
--     strategy_name VARCHAR(100) NOT NULL COMMENT '策略名称',
--     start_date DATE NOT NULL COMMENT '回测开始日期',
--     end_date DATE NOT NULL COMMENT '回测结束日期',
--     status VARCHAR(20) NOT NULL DEFAULT 'PENDING' COMMENT '任务状态，如PENDING, RUNNING, COMPLETED, FAILED',
--     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '任务创建时间',
--     updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '任务最后更新时间'
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 爬虫日志
CREATE TABLE fetch_log(
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    job_type ENUM('ths_industry_quote', 'tdx_stocks_quote') NOT NULL COMMENT '任务类型，同花顺行业实时日线/通达信实时日线',
    job_status ENUM('success', 'failed') NOT NULL COMMENT '任务状态，成功为SUCCESS，失败为FAILED',
    msg TEXT NOT NULL COMMENT '日志信息',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE trade_account(
    account_id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '账户ID',
    account_name VARCHAR(50) NOT NULL DEFAULT '模拟账户' COMMENT '账户名称',
    
)

-- 游资营业部
CREATE TABLE hot_money(
    department_name VARCHAR(255) PRIMARY KEY COMMENT '营业部名称',
    hot_money_name VARCHAR(255) NOT NULL COMMENT '关联的游资名称'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 龙虎榜个股列表
CREATE TABLE lhb_stock_list(
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    trade_date DATE NOT NULL COMMENT '交易日期',
    stock_code VARCHAR(20) NOT NULL COMMENT '股票的纯数字代码，如601881',
    stock_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '股票的名称，如中国银河',
    range_days INT NOT NULL DEFAULT 0 COMMENT '时间范围，如1为1日榜，3为3日榜',
    reason_list JSON NOT NULL COMMENT '上榜理由列表，格式为：["有价格涨跌幅限制的日收盘价格涨幅达到15%的证券", "有价格涨跌幅限制的日换手率达到30%的证券"]',
    buy_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '买入金额',
    sell_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '卖出金额',
    net_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '净买金额',
    hot_money_net_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '游资净买金额',
    org_net_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '机构净买金额',
    limit_reason VARCHAR(255) NOT NULL DEFAULT '' COMMENT '涨停原因',
    concept_list JSON NOT NULL COMMENT '概念列表，格式为: [{"code": "885907", "name": "科创次新股"}, {"code": "886009", "name": "先进封装"}]',
    UNIQUE(trade_date, stock_code, range_days)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 龙虎榜个股席位买卖数据
CREATE TABLE lhb_stock_detail(
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    trade_date DATE NOT NULL COMMENT '交易日期',
    stock_code VARCHAR(20) NOT NULL COMMENT '股票的纯数字代码，如601881',
    stock_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '股票的名称，如中国银河',
    range_days INT NOT NULL DEFAULT 0 COMMENT '时间范围，如1为1日榜，3为3日榜',
    trade_type ENUM('buy', 'sell') NOT NULL COMMENT '交易类型，为买榜或卖榜',
    `name` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '席位名称，如 高盛（中国）证券有限责任公司上海浦东新区世纪大道证券营业部',
    short_name VARCHAR(255) NOT NULL DEFAULT '' COMMENT '席位短名称，如 高盛(中国)上海浦东新区世纪大道证券营业部',
    buy_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '买入金额',
    sell_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '卖出金额',
    net_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '净买金额',
    INDEX(trade_date),
    INDEX(stock_code),
    INDEX(`name`),
    INDEX(short_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 涨停原因
CREATE TABLE limit_up_reason(
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    trade_date DATE NOT NULL COMMENT '交易日期',
    stock_code VARCHAR(20) NOT NULL COMMENT '股票的纯数字代码，如601881',
    stock_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '股票的名称，如中国银河',
    limit_up_type VARCHAR(50) NOT NULL DEFAULT '' COMMENT '涨停类型，如一字板、换手板等',
    reason_type VARCHAR(255) NOT NULL DEFAULT '' COMMENT '涨停原因，如光通信+机器人+光电集成封测',
    change_rate DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '涨跌幅，单位为百分比',
    turnover_rate DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '换手率，单位为百分比',
    high_days VARCHAR(20) NOT NULL DEFAULT '' COMMENT '连续涨停天数，如首板、二板、三板等',
    first_limit_up_time TIMESTAMP NULL COMMENT '首次涨停时间',
    last_limit_up_time TIMESTAMP NULL COMMENT '最后涨停时间',
    INDEX(trade_date),
    INDEX(stock_code),
    UNIQUE(trade_date, stock_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;