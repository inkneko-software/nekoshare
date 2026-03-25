from pydantic import BaseModel

class PressurePoint(BaseModel):
    trade_date: str
    price: float