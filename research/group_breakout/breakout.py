from math import sqrt
import queue
from typing import Optional
from entity.StockDayPrice import StockDayPrice
from datetime import date, date, datetime
from dateutil.relativedelta import relativedelta
from dataclasses import dataclass
import group_breakout.fetch as nk
import warnings
from utils.log import LoggerFactory
from group_breakout import trade_day
from model import (
    Rectangle,
    BreakoutResult,
    ProfitResult,
    BreakoutStrategyExecutingResult,
    BacktraceResult,
    Candlestick
)

log = LoggerFactory.get_logger(__name__)

# 屏蔽特定类型的弃用警告
warnings.filterwarnings(
    "ignore",
    category=FutureWarning,
    message=".*Series.fillna with 'method' is deprecated.*",
)

# 或者更精确地屏蔽所有来自tushare的FutureWarning
warnings.filterwarnings("ignore", category=FutureWarning, module="tushare")


def get_recent_down_trend_line(candlesticks: list[Candlestick]) -> tuple[float, float]:
    """
    获取最近的下降趋势线
    """
    pass


def is_recent_flat_consolidation(
    candlesticks: list[Candlestick],
) -> tuple[Rectangle, Rectangle, Rectangle]:
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
            # 如果6日内涨幅超过25%，则跳过
            if ((mu_h - mu_l) / mu_l) > 0.25:
                continue
            possible_regions.append((i, j, mu_h, mu_l, sigma_h, sigma_l))

    if len(possible_regions) == 0:
        return (None, None, None)
    # 取最近且波动最小的箱体
    possible_regions.sort(key=lambda r: (r[1]), reverse=True)
    tmp = possible_regions[: round(len(possible_regions) / 3)]
    tmp.sort(key=lambda r: (r[4] + r[5]))
    recent_box = tmp[0] if len(tmp) > 0 else None
    # 取波动最小且长度最大的箱体
    possible_regions.sort(key=lambda r: (r[4] + r[5]))
    tmp = possible_regions[: round(len(possible_regions) / 3)]
    tmp.sort(key=lambda r: (r[1] - r[0]), reverse=True)
    best_box = tmp[0] if len(tmp) > 0 else None
    # nearest_box为当前区间最后一天前为右边界的箱体
    region = [r for r in possible_regions if (r[1] == len(candlesticks) - 1)]
    region.sort(key=lambda r: (r[4] + r[5]))
    tmp = region[: round(len(region) / 3)]
    tmp.sort(key=lambda r: (r[1] - r[0]), reverse=True)
    nearest_box = tmp[0] if len(tmp) > 0 else None

    return [
        (
            Rectangle(
                start_date=candlesticks[nearest_box[0]].trade_date,
                end_date=candlesticks[nearest_box[1]].trade_date,
                high_price=nearest_box[2],
                low_price=nearest_box[3],
            )
            if nearest_box is not None
            else None
        ),
        (
            Rectangle(
                start_date=candlesticks[recent_box[0]].trade_date,
                end_date=candlesticks[recent_box[1]].datrade_datete,
                high_price=recent_box[2],
                low_price=recent_box[3],
            )
            if recent_box is not None
            else None
        ),
        (
            Rectangle(
                start_date=candlesticks[best_box[0]].trade_date,
                end_date=candlesticks[best_box[1]].trade_date,
                high_price=best_box[2],
                low_price=best_box[3],
            )
            if best_box is not None
            else None
        ),
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
            trade_date=data.trade_date,
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
    log.info(is_recent_flat_consolidation(d))


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


def is_break_out(candlesticks: list[StockDayPrice]) -> BreakoutResult:
    """
    判断最后一根K线是否突破

    目前的逻辑是判断是创几日新高
    """
    if (n := new_high(candlesticks)) > 0:
        return BreakoutResult(is_break_out=True, new_high_days=n)

    return False


def breakout(
    resultQueue: queue.Queue[BreakoutStrategyExecutingResult],
    start_date="20250601",
    end_date="20251027",
):
    try:
        # 选取当日突破板块，并选取其成分股中突破的个股
        # end_date = date.today().strftime("%Y%m%d")
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
            if len(ret_day) < 30:
                continue

            d = [
                Candlestick(
                    trade_date=data.trade_date,
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
            (a, b, c) = is_recent_flat_consolidation(d)
            if (
                d[-1].change_pct > 0
                and (result := is_break_out(d))
                and result.new_high_days > 5
                and d[-1].close > a.high_price
                and (float(d[-1].close) - a.high_price) / a.high_price < 0.05
            ):
                industry.result = result
                industry.a = a
                industry.b = b
                industry.c = c
                selected_industries.append(industry)

        selected_industries.sort(key=lambda ind: ind.change_pct, reverse=True)
        # 获取所有选中板块的成分股
        for industry in selected_industries:
            resultQueue.put(
                BreakoutStrategyExecutingResult(
                    type="industry",
                    code=industry.code,
                    name=industry.name,
                    change_pct=float(industry.change_pct),
                    result=BreakoutResult(
                        is_break_out=industry.result.is_break_out,
                        new_high_days=industry.result.new_high_days,
                    ),
                    rectangle_nearest=industry.a,
                    rectangle_recent=industry.b,
                    rectangle_large=industry.c,
                )
                # f"突破板块: {industry.name}, {industry.change_pct}% {industry.result}"
            )  # 回发给客户端
            stocks = nk.get_ths_industry_stocks(industry.code)
            for stock in stocks:
                # 只做主板
                if not stock.stock_code.startswith(
                    ("6", "0")
                ) or stock.stock_code.startswith("688"):
                    continue
                if stock.stock_name.startswith(("*", "ST", "退", "N", "C")):
                    continue
                d = []
                i = 0
                ret_day = nk.get_stock_day_price(
                    code=stock.stock_code,
                    start_date=start_date,
                    end_date=end_date,  # date.today().strftime("%Y%m%d")
                )
                if len(ret_day) < 30:
                    continue

                d = [
                    Candlestick(
                        trade_date=data.trade_date,
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
                log.debug(
                    f"板块: {industry.name}, 股票: {stock.stock_code} {stock.stock_name} {len(d)}"
                )
                (a, b, c) = is_recent_flat_consolidation(d)
                if (
                    a != None  # 要求6日内不能超过25
                    and d[-1].close > a.high_price
                    and (d[-1].close - a.high_price) / a.high_price < 0.06
                    and (result := is_break_out(d))
                    and result.new_high_days > 5
                ):
                    resultQueue.put(
                        BreakoutStrategyExecutingResult(
                            type="stock",
                            code=stock.stock_code,
                            name=stock.stock_name,
                            change_pct=float(d[-1].change_pct),
                            result=BreakoutResult(
                                is_break_out=result.is_break_out,
                                new_high_days=result.new_high_days,
                            ),
                            rectangle_nearest=a,
                            rectangle_recent=b,
                            rectangle_large=c,
                        )
                    )
    finally:
        resultQueue.put(None)


def breakout_backtrace(
    resultQueue: queue.Queue[BacktraceResult],
    start_date="20250601",
    end_date="20251021",
):
    """
    对指定日期进行每日回测，只返回3日内涨幅大于5%，或5日内涨幅大于5%，或10日内涨幅大于8%的个股
    """
    start_date = datetime.strptime(start_date, "%Y%m%d").date()
    end_date = datetime.strptime(end_date, "%Y%m%d").date()

    if start_date > end_date:
        return

    # 从最后一个交易日开始回测
    trade_date = (
        end_date
        if trade_day.is_trading_day(end_date)
        else trade_day.get_prev_trading_day(trade_date)
    )
    while trade_date >= start_date:
        log.info(f"开始处理: {trade_date}")
        # 获取当日策略结果
        tmpResultQueue = queue.Queue()
        breakout(tmpResultQueue, trade_date - relativedelta(months=3), trade_date)

        # 跳过无结果的日期
        if tmpResultQueue.qsize() == 0:
            continue

        results = []
        backtrace_results = []
        last_industry = None
        item = tmpResultQueue.get()
        total = 0
        success_num = 0
        while item != None:
            if item.type != "stock":
                last_industry = item
                item = tmpResultQueue.get()
                continue

            total += 1
            # 查询后10日涨幅
            delta_date = trade_date
            for i in range(10):
                delta_date = trade_day.get_next_trading_day(delta_date)
            stockPrices = nk.get_stock_day_price(item.code, trade_date, delta_date)
            if len(stockPrices) < 10:
                item = tmpResultQueue.get()
                continue
            three_day_change_pct = (
                max([s.close for s in stockPrices[:3]]) - stockPrices[0].close
            ) / stockPrices[0].close
            five_day_change_pct = (
                max([s.close for s in stockPrices[:5]]) - stockPrices[0].close
            ) / stockPrices[0].close
            ten_day_change_pct = (
                max([s.close for s in stockPrices[:10]]) - stockPrices[0].close
            ) / stockPrices[0].close
            if (
                three_day_change_pct >= 0.05
                or five_day_change_pct >= 0.05
                or ten_day_change_pct >= 0.08
            ):
                if last_industry != None:
                    results.append(last_industry)
                    backtrace_results.append(
                        ProfitResult(three_day=0, five_day=0, ten_day=0)
                    )
                    last_industry = None
                success_num += 1
                results.append(item)
                backtrace_results.append(
                    ProfitResult(
                        three_day=three_day_change_pct,
                        five_day=five_day_change_pct,
                        ten_day=ten_day_change_pct,
                    )
                )
            item = tmpResultQueue.get()

        resultQueue.put(
            BacktraceResult(
                date=trade_date.strftime("%Y%m%d"),
                results=results,
                backtrace_results=backtrace_results,
                total=total,
                success_num=success_num,
            )
        )
        log.info(f"日期: {trade_date}), 个数: {len(results)}")
        for i in range(len(results)):
            log.info(
                f"\t个股: {results[i].code} {results[i].name}, 涨幅: {backtrace_results[i].three_day:.2%}, {backtrace_results[i].five_day:.2%}, {backtrace_results[i].ten_day:.2%}"
            )

        trade_date = trade_day.get_prev_trading_day(trade_date)

    resultQueue.put(None)


if __name__ == "__main__":
    # main()
    # _test_is_recent_flat_consolidation()
    resultQueue = queue.Queue()
    breakout_backtrace(resultQueue)
