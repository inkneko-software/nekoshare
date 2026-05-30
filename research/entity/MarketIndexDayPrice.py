from dataclasses import dataclass
from datetime import date

@dataclass
class MarketIndexDayPrice:
    code: str      
    name: str       
    trade_date: date       
    open: float            # 开盘价
    close: float           # 收盘价
    high: float            # 最高价
    low: float             # 最低价
    volume: int            # 成交量，单位为股
    amount: float          # 成交额，单位为元