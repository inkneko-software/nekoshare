"""
思路为获取某日的高量突破结果，在下一个交易日准备进行买入，并回测后10个交易日的表现

买入条件为 如果高开，则高开向上1%买入，如果平开或低开，需要在价格大于昨日最高价1%的时候买入

离场条件为收盘价跌破5日线，或者跌停。如果10个交易日仍未离场，则在第10个交易日收盘离场
"""

from dataclasses import dataclass
import queue
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
from data.quote import get_stock_day_price
from model.VolumeBreakoutStrategyExecutingResult import (
    VolumeBreakoutStrategyExecutingResult,
)
from group_breakout import trade_day
from strategy.high_volume_breakout import high_volume_breakout


def get_breakout_stocks(end_date: str) -> list[VolumeBreakoutStrategyExecutingResult]:
    """
    获取某日的高量突破结果
    """
    resultQueue: queue.Queue[VolumeBreakoutStrategyExecutingResult] = queue.Queue()
    two_years_ago = (
        datetime.strptime(end_date, "%Y%m%d")
        - relativedelta(years=1)
        - relativedelta(days=180)
    ).strftime("%Y%m%d")
    high_volume_breakout(resultQueue, two_years_ago, end_date)
    # 逐个获取resultQueue中的结果,直到获取到None为止
    result = resultQueue.get()
    ret = []
    while result is not None:
        ret.append(result)
        result = resultQueue.get()
    return ret


def calculateMA(prices, n):
    """
    计算某日的n日均线

    :param prices: 价格列表，按照时间顺序排列，要求prices[-1]为最新的价格
    :param n: 均线的周期
    """
    if len(prices) < n:
        return None
    return sum(prices[-n:]) / n


@dataclass
class TradeHistory:
    stock_code: str
    stock_name: str
    buy_date: str
    buy_price: float
    sell_date: str
    sell_price: float
    sell_reason: str
    change_pct: float


def tradeNextDay(trade_date: str) -> list[TradeHistory]:
    """
    获取指定日期的选股结果，并于下一交易日开始按照要求进行交易

    :param date: 日期，格式为 'YYYYMMDD'
    """
    trade_date = datetime.strptime(trade_date, "%Y%m%d").date()
    end_date = trade_date
    for i in range(10):
        end_date = trade_day.get_next_trading_day(end_date)
    minus_5_days = trade_date
    for i in range(5):
        minus_5_days = trade_day.get_prev_trading_day(minus_5_days)
    results = []
    selected_stocks = get_breakout_stocks(trade_date.strftime("%Y%m%d"))
    for result in selected_stocks:
        prices = get_stock_day_price(result.code, minus_5_days, end_date)
        if len(prices) < 6:
            continue
        buy_price = 0

        if prices[6].open > prices[5].close:
            # 如果第二日高开，则在高开价的基础上向上1%买入
            buy_price = prices[6].open * 1.01
        else:
            # 如果第二日平开或低开，则在价格大于昨日最高价1%的时候买入
            buy_price = prices[5].high * 1.01

        if buy_price < prices[6].high and buy_price > prices[6].low:
            # 如果第二日的最高价都没有达到买入价，则放弃交易
            for i, price in enumerate(prices[6:]):
                # 离场条件为收盘价跌破5日线，或者跌停。如果10个交易日仍未离场，则在第10个交易日收盘离场
                ma5 = calculateMA([p.close for p in prices[: 6 + i]], 5)
                if price.close < ma5:

                    results.append(
                        TradeHistory(
                            result.code,
                            result.name,
                            prices[6].trade_date.strftime("%Y-%m-%d"),
                            buy_price,
                            price.trade_date.strftime("%Y-%m-%d"),
                            price.close,
                            "跌破5日线",
                            (price.close - buy_price) / buy_price,
                        )
                    )
                    break
                elif price.close <= price.pre_close * 0.9:
                    results.append(
                        TradeHistory(
                            result.code,
                            result.name,
                            prices[6].trade_date.strftime("%Y-%m-%d"),
                            buy_price,
                            price.trade_date.strftime("%Y-%m-%d"),
                            price.close,
                            "跌停",
                            (price.close - buy_price) / buy_price,
                        )
                    )
                    break
                elif i == len(prices[6:]) - 1:
                    results.append(
                        TradeHistory(
                            result.code,
                            result.name,
                            prices[6].trade_date.strftime("%Y-%m-%d"),
                            buy_price,
                            price.trade_date.strftime("%Y-%m-%d"),
                            price.close,
                            "仍持有计算收益",
                            (price.close - buy_price) / buy_price,
                        )
                    )
                    break
    return results


if __name__ == "__main__":
    results = tradeNextDay("20260113")
    for result in results:
        print(result)
