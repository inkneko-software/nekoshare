from dataclasses import dataclass
@dataclass
class StockData:
    stock_code: str       # 股票的纯数字代码，如601881
    stock_name: str       # 股票的名称，如中国银河
    price: float          # 当前价格，单位为元
    open: float           # 开盘价，单位为元
    high: float           # 最高价，单位为元
    low: float            # 最低价，单位为元
    percent_change: float
    pre_close: float      # 前一日收盘价，单位为元
    quantity_ratio: float
    float_share: float    # 流通股本，单位为股
    float_cap: float      # 流通市值，单位为元
    pe_ratio: float       # 市盈率
    industry: str         # 行业分类
    area: str             # 地区分类