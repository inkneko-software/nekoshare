from pydantic import BaseModel
from .BreakoutResult import BreakoutResult
from .Rectangle import Rectangle
from typing import Optional

class BreakoutStrategyExecutingResult(BaseModel):
    type: str
    code: str
    name: str
    change_pct: float
    result: BreakoutResult
    rectangle_nearest: Optional[Rectangle] = None
    rectangle_recent: Optional[Rectangle] = None
    rectangle_large: Optional[Rectangle] = None