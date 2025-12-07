from datetime import date
from pydantic import BaseModel

class TrendLine(BaseModel):
    """
    趋势线
    """
    start_date: date
    si: int
    end_date: date
    di: int
    high_price: float
    low_price: float
    slope: float
    intercept: float