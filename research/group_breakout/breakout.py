from math import sqrt
from entity.StockDayPrice import StockDayPrice
import akshare as ak
from datetime import date
import json
from dataclasses import dataclass
import tushare as ts
import group_breakout.fetch as nk
from pydantic import BaseModel
import warnings


# 屏蔽特定类型的弃用警告
warnings.filterwarnings(
    "ignore",
    category=FutureWarning,
    message=".*Series.fillna with 'method' is deprecated.*",
)

# 或者更精确地屏蔽所有来自tushare的FutureWarning
warnings.filterwarnings("ignore", category=FutureWarning, module="tushare")


@dataclass
class Candlestick:
    date: date
    open: float
    high: float
    low: float
    close: float
    volume: int
    change_pct: float
    pre_close: float


def get_recent_down_trend_line(candlesticks: list[Candlestick]) -> tuple[float, float]:
    """
    获取最近的下降趋势线
    """
    pass

class Rectangle(BaseModel):
    start_date: date
    end_date: date
    high_price: float
    low_price: float

def is_recent_flat_consolidation(
    candlesticks: list[Candlestick],
) -> tuple[Rectangle, Rectangle]:
    """
    判断最近是否横盘调整
    思路是，选取当前区间的最高点，然后选取当前区间的10%高点，
    """

    # 箱体上沿选取前10%的高点

    # 取总体的标准差，越接近0越好
    # 标准差sigma = sqrt( sum((xi - mu)^2) / n )，其中mu为均值
    possible_regions = []

    # 枚举区间内所有可能的箱体，选取三个箱体
    # 第一个箱体是以当前日期为起点的最合适箱体（用于与下面两个作比较）
    # 第二个是区间内最近的波动最小的箱体
    # 第三个是区间内最大的波动最小的箱体 
    for i in range(0, len(candlesticks)):
        for j in range(i, len(candlesticks)):
            region = candlesticks[i : j + 1]
            if len(region) < 6:
                continue

            # 计算箱体的高点均值和标准差
            prices = [c.high for c in region]
            prices.sort()
            selected_num = round(len(prices) / 3)
            mu_h = sum(prices[-selected_num:]) / selected_num
            sigma_h = 0
            for price in prices[-selected_num:]:
                sigma_h += (price - mu_h) ** 2
            sigma_h = sqrt(sigma_h / selected_num)

            # 计算箱体的低点均值和标准差
            prices = [c.low for c in region]
            prices.sort()
            mu_l = sum(prices[:selected_num]) / selected_num
            sigma_l = 0
            for price in prices[:selected_num]:
                sigma_l += (price - mu_l) ** 2
            sigma_l = sqrt(sigma_l / selected_num)

            if ((mu_h - mu_l) / mu_l) > 0.25:
                continue
            possible_regions.append((i, j, mu_h, mu_l, sigma_h, sigma_l))

    #取最近且波动最小的箱体
    possible_regions.sort(key=lambda r: (r[1]) ,reverse=True)
    tmp = possible_regions[: round(len(possible_regions) / 3)]
    tmp.sort(key=lambda r: (r[4] + r[5]))
    nearest_box = tmp[0]
    #取波动最小且长度最大的箱体
    possible_regions.sort(key=lambda r: (r[4] + r[5]))
    tmp = possible_regions[: round(len(possible_regions) / 3)]
    tmp.sort(key=lambda r: (r[1] - r[0]), reverse=True)
    best_box = tmp[0]
    return [
        Rectangle(
            start_date=candlesticks[nearest_box[0]].date,
            end_date=candlesticks[nearest_box[1]].date,
            high_price=nearest_box[2],
            low_price=nearest_box[3],
        ),
        Rectangle(
            start_date=candlesticks[best_box[0]].date,
            end_date=candlesticks[best_box[1]].date,
            high_price=best_box[2],
            low_price=best_box[3],
        )
        
    ]

def _test_is_recent_flat_consolidation():

    start_date = "20250601"
    end_date = date.today().strftime("%Y%m%d")
    end_date = "20251021"
    ret_day = nk.get_stock_day_price(
        code="601068",
        start_date=start_date,
        end_date=end_date,  # date.today().strftime("%Y%m%d")
    )
    d = [
        Candlestick(
            date=data.trade_date,
            open=data.open,
            high=data.high,
            low=data.low,
            close=data.close,
            volume=data.volume,
            change_pct=data.percent_change,
            pre_close=data.pre_close,
        )
        for data in ret_day
    ]
    print(is_recent_flat_consolidation(d))


def new_high(candlesticks: list[Candlestick]) -> int:
    """
    判断当前处于几日新高
    """
    i = 0
    close = candlesticks[-1].close
    for candlestick in reversed(candlesticks[:-1]):
        # 如果收阳线，则判断收盘价
        # 如果收阴线，则判断开盘价
        if candlestick.close >= candlestick.open:
            check_price = candlestick.close
        else:
            check_price = candlestick.open

        if check_price >= close:
            break

        i += 1
    return i


@dataclass
class ProbeResult:
    is_break_out: bool
    new_high_days: int


def is_break_out(candlesticks: list[StockDayPrice]) -> ProbeResult:
    """
    判断最后一根K线是否突破

    目前的逻辑是判断是创几日新高
    """
    if (n := new_high(candlesticks)) > 0:
        return ProbeResult(True, n)

    return False


def main():
    # 选取当日突破板块，并选取其成分股中突破的个股
    start_date = "20250601"
    end_date = date.today().strftime("%Y%m%d")
    end_date = "20251020"

    # 获取所有行业板块
    industries = nk.get_ths_industry_market()
    selected_industries = []
    results = []
    for industry in industries:
        d = []
        i = 0
        ret_day = nk.get_ths_industry_day_price(
            code=industry.code,
            start_date=start_date,
            end_date=end_date,  # date.today().strftime("%Y%m%d")
        )
        d = [
            Candlestick(
                date=data.trade_date,
                open=data.open,
                high=data.high,
                low=data.low,
                close=data.close,
                volume=data.volume,
                change_pct=round(
                    (data.close - data.pre_close) / data.pre_close * 100, 2
                ),
                pre_close=data.pre_close,
            )
            for data in ret_day
        ]
        industry.change_pct = d[-1].change_pct
        if (
            d[-1].change_pct > 0
            and (result := is_break_out(d))
            and result.new_high_days > 5
        ):
            industry.result = result
            selected_industries.append(industry)

    selected_industries.sort(key=lambda ind: ind.change_pct, reverse=True)
    # 获取所有选中板块的成分股
    for industry in selected_industries:
        print(f"突破板块: {industry.name}, {industry.change_pct}% {industry.result}")
        stocks = nk.get_ths_industry_stocks(industry.code)
        for stock in stocks:
            # 只做主板
            if not stock.stock_code.startswith(("6", "0")):
                continue
            if stock.stock_code.startswith(("*", "ST", "退", "N", "C")):
                continue
            d = []
            i = 0
            ret_day = nk.get_stock_day_price(
                code=stock.stock_code,
                start_date=start_date,
                end_date=end_date,  # date.today().strftime("%Y%m%d")
            )
            d = [
                Candlestick(
                    date=data.trade_date,
                    open=data.open,
                    high=data.high,
                    low=data.low,
                    close=data.close,
                    volume=data.volume,
                    change_pct=data.percent_change,
                    pre_close=data.pre_close,
                )
                for data in ret_day
            ]
            (a, b) = is_recent_flat_consolidation(d)
            if d[-1].close > a[2] and (d[-1].close - a[2]) / a[2] < 0.06 and (result := is_break_out(d)) and result.new_high_days > 5:
                print(
                    f"    突破个股: {stock.stock_code} {stock.stock_name},  {d[-1].change_pct}% {result}, {a}"
                )



if __name__ == "__main__":
    # main()
    _test_is_recent_flat_consolidation()