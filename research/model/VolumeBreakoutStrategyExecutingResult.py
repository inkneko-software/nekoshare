from pydantic import BaseModel

from model.PressurePoint import PressurePoint
from .BreakoutResult import BreakoutResult
from typing import Optional
from .TrendLine import TrendLine

class VolumeBreakoutStrategyExecutingResult(BaseModel):
    type: str
    code: str
    name: str
    change_pct: float
    pressure_points: list[PressurePoint]