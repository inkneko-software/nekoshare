from model import Candlestick
from entity import StockDayPrice
import queue
import group_breakout.fetch as nk
from model import BreakoutStrategyExecutingResult, BreakoutResult, BacktraceResult, ProfitResult, PressurePoint, VolumeBreakoutStrategyExecutingResult
from datetime import date, datetime, timedelta
from dateutil.relativedelta import relativedelta
from group_breakout.trade_day import get_prev_trading_day, get_next_trading_day, is_trading_day
from group_breakout import trade_day

from utils.log import LoggerFactory
log = LoggerFactory.get_logger(__name__)

"""
高量突破策略

基于近两年的日K线数据，寻找成交量靠前(通过变量指定，默认前5%)的交易日，以这些日K线的开盘、收盘、最高价、最低价作为买入与卖出的依据

首先对K线以成交量为依据进行排序，选出前5%高成交量的K线。在这些K线中，以成交量作为第一次要权重，以min(开盘价,收盘价)作为主要权重，权重大小与数值成正比

然后再以交易日作为第二权重，选出这5%中的min(8, len(5%高量K线))根K线，作为突破的参考依据

---

一些需要修改的地方：

1. 价格问题，有些高量K的价格，可能在右侧有更高的价格，但是成交量更小，所以需要考虑如果右侧有更高价的高量K，以右侧为准

2. 一字板直接忽略

3. 45°斜向上的走势，高量K在前面，主力锁仓导致后面已经涨了很久，但交易量较小。需要考虑价格的偏移程度（风险控制）

4. 高量K的距离，有时候太近了。此时的突破成功概率就不是很有把握

5. 假突破。有时大盘环境不好，或者单纯的建仓过猛。需要长期跟踪。不过这个模型应该能在再次突破的时候扫到它
"""

def get_high_volume_candlesticks(
    candlesticks: list[Candlestick], volume_percentile: int = 5
) -> list[Candlestick]:
    """
    获取成交量靠前的K线（按百分位数）
    
    Args:
        candlesticks: K线列表
        volume_percentile: 成交量百分位数，默认10表示前10%
    
    Returns:
        成交量靠前的K线列表
    """
    if len(candlesticks) == 0:
        return []
    # 如果数据量太少，使用固定的数量而不是百分位数
    min_data_points = 20  # 最少需要20个数据点才能使用百分位数
    if len(candlesticks) < min_data_points:
        # 对于少量数据，取成交量最大的前 max(2, len(candlesticks)//5) 根K线
        num_high_volume = max(2, len(candlesticks) // 5)
        sorted_by_volume = sorted(candlesticks, key=lambda c: c.volume, reverse=True)
        return sorted_by_volume[:num_high_volume]
    
    # 计算成交量的百分位数
    volumes = sorted([c.volume for c in candlesticks])
    volume_threshold = volumes[int(len(volumes) * (100 - volume_percentile) / 100)]
    
    # 返回成交量大于等于阈值的K线
    return [c for c in candlesticks if c.volume >= volume_threshold]


def get_recent_high_volume_candlesticks(
    candlesticks: list[Candlestick], volume_percentile: int = 5
) -> list[Candlestick]:
    """
    从高成交量K线中按权重选择参考K线
    
    以成交量和min(开盘价,收盘价)作为权重进行加权排序，然后选出min(8, len(高量K线))根K线
    
    Args:
        candlesticks: K线列表
        count: 已废弃，不再使用
        volume_percentile: 成交量百分位数，默认10表示前10%
    
    Returns:
        按加权排序后的K线列表（按交易日排序，从早到晚）
    """
    high_volume = get_high_volume_candlesticks(candlesticks, volume_percentile)
    
    if len(high_volume) == 0:
        return []
    
    # 计算权重：成交量 + min(开盘价, 收盘价)
    # 权重大小与数值成正比
    def calculate_weight(c: Candlestick) -> float:
        min_price = min(c.open, c.close)
        return c.volume + min_price
    
    # 按权重排序（降序）
    weighted_candlesticks = sorted(high_volume, key=calculate_weight, reverse=True)
    
    # 选出前min(8, len(高量K线))根K线
    selected_count = min(8, len(high_volume))
    selected_candlesticks = weighted_candlesticks[:selected_count]
    
    # 按交易日排序后返回（从早到晚）
    result = sorted(selected_candlesticks, key=lambda c: c.trade_date)
    return result


def is_high_volume_breakout(
    candlesticks: list[Candlestick], volume_percentile: int = 5
) -> tuple[bool, list[PressurePoint]]:
    """
    判断当前是否是高量突破，并返回压力点列表
    
    条件：当日收盘价超过按权重选出的参考K线中的最高开盘价和最低价
    
    Args:
        candlesticks: K线列表
        volume_percentile: 成交量百分位数，默认5表示前5%
    
    Returns:
        (是否突破, 压力点列表)。不突破时返回 (False, [])。
    """
    if len(candlesticks) < 3:  # 需要至少3根K线（当前+参考K线）
        return False, []
    
    # 使用历史数据（排除当前K线）来获取参考K线
    historical_candlesticks = candlesticks[:-1]
    reference_candlesticks = get_recent_high_volume_candlesticks(
        historical_candlesticks, volume_percentile=volume_percentile
    )
    if len(reference_candlesticks) == 0:
        return False, []
    
    current_close = candlesticks[-1].close
    
    # 当日收盘价需要超过参考K线中的最高开盘价和最低价
    threshold_open = max([c.open for c in reference_candlesticks])
    threshold_low = max([c.low for c in reference_candlesticks])
    threshold = max(threshold_open, threshold_low)
    
    # 1. 判断高量K突破条件是否满足
    if current_close < threshold:
        return False, []
    
    log.info(
            f"高量突破条件满足: 当日收盘价 {current_close} > "
            f"参考K线的最高开盘价和最低价 {threshold}"
        )
    log.info(f"参考K线数量: {len(reference_candlesticks)}")

    # 2. 拉取附近7天的价格，判断是否突破
    recent_week_candlesticks = [max(c.open, c.close) for c in candlesticks[-28:-1]]
    if current_close < max(recent_week_candlesticks):
        return False, []

    # 3. 依据参考K线构建压力点列表（可按业务需求调整price）
    pressure_points = [
        PressurePoint(trade_date=str(c.trade_date), price=c.high)
        for c in reference_candlesticks
    ]

    return True, pressure_points


def high_volume_breakout(
    resultQueue: queue.Queue[VolumeBreakoutStrategyExecutingResult],
    start_date: str = "20240601",
    end_date: str = "20251027",
    volume_percentile: int = 5,
):
    """
    高量突破策略主函数
    
    Args:
        resultQueue: 结果队列
        start_date: 开始日期，格式为YYYYMMDD
        end_date: 结束日期，格式为YYYYMMDD
        volume_percentile: 成交量百分位数，默认5表示前5%
    """
    try:
        # 获取所有行业板块
        industries = nk.get_ths_industry_market()
        industries = [ind for ind in industries if ind.code.startswith("881")]
        
        # 遍历所有行业板块的成分股
        for industry in industries:
            # 获取板块的成分股
            stocks = nk.get_ths_industry_stocks(industry.code)
            for stock in stocks:
                # 只做主板
                if not stock.stock_code.startswith(("6", "0")) or stock.stock_code.startswith("688"):
                    continue
                if stock.stock_name.startswith(("*", "ST", "退", "N", "C")):
                    continue

                # log.info(f"处理股票: {stock.stock_code} {stock.stock_name}")

                # 获取股票近两年的数据
                ret_day = nk.get_stock_day_price(
                    code=stock.stock_code,
                    start_date=start_date,
                    end_date=end_date,
                )

                if ret_day is None or len(ret_day) == 0 or ret_day[-1].percent_change <= 1:
                    continue
                
                if len(ret_day) < 30:
                    continue
                
                # 转换为Candlestick对象
                candlesticks = [
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
                
                # 检查是否是高量突破，并同时获取压力点
                is_breakout, pressure_points = is_high_volume_breakout(
                    candlesticks, volume_percentile
                )
                if is_breakout:
                    resultQueue.put(
                        VolumeBreakoutStrategyExecutingResult(
                            type="stock",
                            code=stock.stock_code,
                            name=stock.stock_name,
                            change_pct=float(candlesticks[-1].change_pct),
                            pressure_points=pressure_points,
                        )
                    )
                    log.info(f"高量突破: {stock.stock_code} {stock.stock_name}, 涨幅: {candlesticks[-1].change_pct:.2f}%, 压力点: {pressure_points}")
    
    finally:
        resultQueue.put(None)


def high_volume_breakout_backtrace(
    resultQueue: queue.Queue[BacktraceResult],
    start_date: str = "20240601",
    end_date: str = "20251021",
    volume_percentile: int = 5,
):
    """
    高量突破策略回测函数
    
    对指定日期进行每日回测，只返回3日内涨幅大于5%，或5日内涨幅大于5%，或10日内涨幅大于8%的个股
    
    Args:
        resultQueue: 结果队列
        start_date: 开始日期，格式为YYYYMMDD
        end_date: 结束日期，格式为YYYYMMDD
        volume_percentile: 成交量百分位数，默认10表示前10%
    """
    start_date = datetime.strptime(start_date, "%Y%m%d").date()
    end_date = datetime.strptime(end_date, "%Y%m%d").date()
    
    if start_date > end_date:
        return
    
    # 从最后一个交易日开始回测
    trade_date = (
        end_date
        if is_trading_day(end_date)
        else get_prev_trading_day(end_date)
    )
    
    while trade_date >= start_date:
        log.info(f"开始处理: {trade_date}")
        
        # 获取当日策略结果
        tmpResultQueue = queue.Queue()
        two_years_ago = (trade_date - relativedelta(years=1) - relativedelta(days=180)).strftime("%Y%m%d")
        high_volume_breakout(
            tmpResultQueue,
            two_years_ago,
            trade_date.strftime("%Y%m%d"),
            volume_percentile,
        )
        
        # 跳过无结果的日期
        if tmpResultQueue.qsize() == 0:
            trade_date = get_prev_trading_day(trade_date)
            continue
        
        results = []
        backtrace_results = []
        item = tmpResultQueue.get()
        total = 0
        success_num = 0
        
        while item is not None:
            total += 1
            
            # 查询后10日涨幅
            delta_date = trade_date
            for _ in range(10):
                delta_date = get_next_trading_day(delta_date)
            
            stock_prices = nk.get_stock_day_price(
                item.code, trade_date, delta_date
            )
            
            if len(stock_prices) < 10:
                item = tmpResultQueue.get()
                continue
            
            # 计算3日、5日、10日的最大涨幅
            three_day_change_pct = (
                max([s.close for s in stock_prices[:3]]) - stock_prices[0].close
            ) / stock_prices[0].close
            five_day_change_pct = (
                max([s.close for s in stock_prices[:5]]) - stock_prices[0].close
            ) / stock_prices[0].close
            ten_day_change_pct = (
                max([s.close for s in stock_prices[:10]]) - stock_prices[0].close
            ) / stock_prices[0].close
            
            # 判断是否满足回测标准
            if (
                three_day_change_pct >= 0.05
                or five_day_change_pct >= 0.05
                or ten_day_change_pct >= 0.08
            ):
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
        
        log.info(f"日期: {trade_date}, 个数: {len(results)}")
        for i in range(len(results)):
            log.info(
                f"\t个股: {results[i].code} {results[i].name}, "
                f"涨幅: {backtrace_results[i].three_day:.2%}, "
                f"{backtrace_results[i].five_day:.2%}, "
                f"{backtrace_results[i].ten_day:.2%}"
            )
        
        trade_date = get_prev_trading_day(trade_date)
    
    resultQueue.put(None)


if __name__ == "__main__":
    resultQueue = queue.Queue()
    high_volume_breakout(resultQueue, volume_percentile=5)
    log.info(f"高量突破策略执行完成，结果数量: {resultQueue.qsize()}")
    # 处理结果
    # item = resultQueue.get()
    # while item is not None:
    #     item = resultQueue.get()
    #     log.info(f"结果: {item}")