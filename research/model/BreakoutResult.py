from pydantic import BaseModel

class BreakoutResult(BaseModel):
    is_break_out: bool
    new_high_days: float