from pydantic import BaseModel
from .BreakoutResult import BreakoutResult
from typing import Optional
from .TrendLine import TrendLine

class TrendBreakoutStrategyExecutingResult(BaseModel):
    type: str
    code: str
    name: str
    change_pct: float
    trend_lines: list[TrendLine]