from dataclasses import dataclass
@dataclass
class THSIndustryStock:
    industry_code: str
    stock_code: str
    stock_name: str

    def __hash__(self):
        return hash((self.stock_code, self.stock_name))