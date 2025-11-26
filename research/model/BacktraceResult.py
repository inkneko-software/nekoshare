from pydantic import BaseModel
from .BreakoutStrategyExecutingResult import BreakoutStrategyExecutingResult
from .ProfitResult import ProfitResult

class BacktraceResult(BaseModel):
    """
    某日回测记录
    """

    date: str
    results: list[BreakoutStrategyExecutingResult] = []
    backtrace_results: list[ProfitResult] = []
    total: int
    success_num: int