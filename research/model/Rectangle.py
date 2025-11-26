from pydantic import BaseModel
from datetime import date
class Rectangle(BaseModel):
    start_date: date
    end_date: date
    high_price: float
    low_price: float