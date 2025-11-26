
from dataclasses import dataclass
from datetime import date

@dataclass
class Candlestick:
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: int
    change_pct: float
    pre_close: float