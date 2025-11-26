from pydantic import BaseModel

class ProfitResult(BaseModel):
    """
    个股表现
    """

    three_day: float
    five_day: float
    ten_day: float