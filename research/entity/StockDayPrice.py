from dataclasses import dataclass
from datetime import date

@dataclass
class StockDayPrice:
    stock_code: str        # 股票的纯数字代码，如601881
    stock_name: str        # 股票的名称，如中国银河
    trade_date: date       # 记录日期，格式为YYYY-MM-DD
    open: float            # 开盘价
    close: float           # 收盘价
    high: float            # 最高价
    low: float             # 最低价
    pre_close: float       # 前一日收盘价
    volume: int            # 成交量，单位为股
    amount: float          # 成交额，单位为元
    percent_change: float
    close_at_limit_high: bool
    # 是否涨停，True表示是，False表示否
    created_at: date       # 记录创建时间