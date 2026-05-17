
# -- 龙虎榜个股列表
# CREATE TABLE lhb_stock_list(
#     id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
#     trade_date DATE NOT NULL COMMENT '交易日期',
#     stock_code VARCHAR(20) NOT NULL COMMENT '股票的纯数字代码，如601881',
#     stock_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '股票的名称，如中国银河',
#     range_days INT NOT NULL DEFAULT 0 COMMENT '时间范围，如1为1日榜，3为3日榜',
#     reason_list JSON NOT NULL COMMENT '上榜理由列表，格式为：["有价格涨跌幅限制的日收盘价格涨幅达到15%的证券", "有价格涨跌幅限制的日换手率达到30%的证券"]',
#     buy_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '买入金额',
#     sell_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '卖出金额',
#     net_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '净买金额',
#     hot_money_net_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '游资净买金额',
#     org_net_value DECIMAL(20, 2) NOT NULL DEFAULT 0 COMMENT '机构净买金额',
#     limit_reason VARCHAR(255) NOT NULL DEFAULT '' COMMENT '涨停原因',
#     concept_list JSON NOT NULL COMMENT '概念列表，格式为: [{"code": "885907", "name": "科创次新股"}, {"code": "886009", "name": "先进封装"}]',
#     UNIQUE(trade_date, stock_code, range_days)
# ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


from dataclasses import dataclass

@dataclass
class Concept:
    code: str
    name: str


@dataclass
class LhbStockList:
    id: int
    trade_date: str
    stock_code: str
    stock_name: str
    range_days: int
    reason_list: list[str]
    buy_value: float
    sell_value: float
    net_value: float
    hot_money_net_value: float
    org_net_value: float
    limit_reason: str
    concept_list: list[Concept]
    