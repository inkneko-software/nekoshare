
# -- 龙虎榜个股席位买卖数据
# CREATE TABLE lhb_stock_detail(
#     id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
#     trade_date DATE NOT NULL COMMENT '交易日期',
#     stock_code VARCHAR(20) NOT NULL COMMENT '股票的纯数字代码，如601881',
#     stock_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '股票的名称，如中国银河',
#     range_days INT NOT NULL DEFAULT 0 COMMENT '时间范围，如1为1日榜，3为3日榜',
#     trade_type ENUM('buy', 'sell') NOT NULL COMMENT '交易类型，为买榜或卖榜',
#     `name` VARCHAR(255) NOT NULL DEFAULT '' COMMENT '席位名称，如 高盛（中国）证券有限责任公司上海浦东新区世纪大道证券营业部',
#     short_name VARCHAR(255) NOT NULL DEFAULT '' COMMENT '席位短名称，如 高盛(中国)上海浦东新区世纪大道证券营业部',
#     buy_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '买入金额',
#     sell_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '卖出金额',
#     net_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '净买金额',
#     INDEX(trade_date),
#     INDEX(stock_code),
#     INDEX(`name`),
#     INDEX(short_name)
# ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


from dataclasses import dataclass
@dataclass
class LhbStockDetail:
    id: int
    trade_date: str
    stock_code: str
    stock_name: str
    range_days: int
    trade_type: str
    name: str
    short_name: str
    buy_value: float
    sell_value: float
    net_value: float