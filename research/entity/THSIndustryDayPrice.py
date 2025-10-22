from dataclasses import dataclass

@dataclass
class THSIndustryDayPrice:
    industry_code: str
    industry_name: str
    trade_date: str
    open: float
    close: float
    high: float
    low: float
    pre_close: float
    volume: int
    created_at: str