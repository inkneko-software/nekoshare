# -- 涨停原因
# CREATE TABLE limit_up_reason(
#     id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
#     trade_date DATE NOT NULL COMMENT '交易日期',
#     stock_code VARCHAR(20) NOT NULL COMMENT '股票的纯数字代码，如601881',
#     stock_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '股票的名称，如中国银河',
#     limit_up_type VARCHAR(50) NOT NULL DEFAULT '' COMMENT '涨停类型，如一字板、换手板等',
#     reason_type VARCHAR(255) NOT NULL DEFAULT '' COMMENT '涨停原因，如光通信+机器人+光电集成封测',
#     change_rate DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '涨跌幅，单位为百分比',
#     turnover_rate DECIMAL(10, 2) NOT NULL DEFAULT 0 COMMENT '换手率，单位为百分比',
#     high_days VARCHAR(20) NOT NULL DEFAULT '' COMMENT '连续涨停天数，如首板、二板、三板等',
#     first_limit_up_time TIMESTAMP NULL COMMENT '首次涨停时间',
#     last_limit_up_time TIMESTAMP NULL COMMENT '最后涨停时间',
#     INDEX(trade_date),
#     INDEX(stock_code),
#     UNIQUE(trade_date, stock_code)
# ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

from dataclasses import dataclass
@dataclass
class LimitUpReason:
    id: int
    trade_date: str
    stock_code: str
    stock_name: str
    limit_up_type: str
    reason_type: str
    change_rate: float
    turnover_rate: float
    high_days: str
    first_limit_up_time: str
    last_limit_up_time: str