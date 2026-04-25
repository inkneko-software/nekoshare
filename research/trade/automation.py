"""
用于回测策略的收益与成功率

流程如下：
1. 获取指定日期的选股结果
2. 次日根据入场K的收盘价 + 0.5% 的价格条件买入股票
3. 离场条件为跌破入场信号K的最低价，或者某日反包前一日的K线。计算持股周期与收益率
"""

from dataclasses import dataclass
from datetime import datetime, date, timedelta
from decimal import Decimal, ROUND_HALF_UP
import logging
from typing import Optional

import data.quote as nk
from model import PressurePoint
from entity import StockDayPrice
from group_breakout.trade_day import get_next_trading_day, get_prev_trading_day, is_trading_day
from utils.log import LoggerFactory

log = LoggerFactory.get_logger(__name__)
file_handler = None


@dataclass
class TradeRecord:
    """单笔交易记录"""
    stock_code: str                 # 股票代码
    stock_name: str                 # 股票名称
    signal_date: str                # 信号日期（选股日期）
    entry_date: str                 # 入场日期
    entry_price: float              # 入场价格
    exit_date: Optional[str] = None # 出场日期
    exit_price: Optional[float] = None  # 出场价格
    exit_reason: Optional[str] = None   # 出场原因：break_support/reverse_pack
    profit_pct: Optional[float] = None  # 收益率
    holding_days: Optional[int] = None  # 持股周期


def is_reverse_pack(current_day: StockDayPrice, prev_day: StockDayPrice) -> bool:
    """
    判断是否是反包（今日最低价 <= 前一日最低价，且今日最高价 > 前一日最高价）
    """
    if current_day.low <= prev_day.low and current_day.high > prev_day.high:
        return True
    return False


def check_exit_conditions(
    candlesticks: list[StockDayPrice],
    signal_K: StockDayPrice,
    entry_date_idx: int
) -> tuple[bool, str, Optional[StockDayPrice]]:
    """
    检查是否满足出场条件
    
    Args:
        candlesticks: 从入场后的K线列表
        signal_K: 信号K线（参考K线）
        entry_date_idx: 入场日期在列表中的索引
    
    Returns:
        (是否应该出场, 出场原因, 出场的K线)
        出场原因: "break_support" 或 "reverse_pack"
    """
    if len(candlesticks) <= entry_date_idx:
        return False, "", None
    
    # 从入场后的下一天开始检查
    for i in range(entry_date_idx + 1, len(candlesticks)):
        current_day = candlesticks[i]
        
        # 条件1：跌破入场信号K的最低价
        if current_day.low < signal_K.low:
            return True, "break_support", current_day
        
        # 条件2：反包前一日的K线
        if i > 0:
            prev_day = candlesticks[i - 1]
            if is_reverse_pack(current_day, prev_day):
                return True, "reverse_pack", current_day
    
    return False, "", None


def execute_trade(
    stock_code: str,
    stock_name: str,
    signal_date: str,  # 格式：YYYYMMDD
    signal_K: StockDayPrice,
    lookback_days: int = 30
) -> Optional[TradeRecord]:
    """
    执行单笔交易
    
    流程：
    1. 次日判断是否能买入（不能是低开）
    2. 如果能买入，则以 open + 0.5% 的价格买入
    3. 持续持有，直到满足出场条件
    4. 计算收益率和持股周期
    
    Args:
        stock_code: 股票代码
        stock_name: 股票名称
        signal_date: 信号日期（YYYYMMDD）
        signal_K: 信号K线
        lookback_days: 向后看多少交易日（最多持股周期）
    
    Returns:
        TradeRecord 或 None（如果无法买入）
    """
    try:
        # 获取信号日期的下一个交易日（入场日期）
        signal_datetime = datetime.strptime(signal_date, "%Y%m%d").date()
        entry_date = get_next_trading_day(signal_datetime)
        
        # 获取向后看的数据（最多监测 lookback_days 个交易日）
        end_date = entry_date
        for _ in range(lookback_days):
            end_date = get_next_trading_day(end_date)
        
        # 获取股票日线数据
        candlesticks = nk.get_stock_day_price(
            stock_code,
            start_date=entry_date,
            end_date=end_date
        )
        
        if len(candlesticks) == 0:
            log.warning(f"无法获取 {stock_code} 的日线数据")
            return None
        
        # 检查入场日期的数据
        entry_day = candlesticks[0]
        if entry_day.trade_date != entry_date:
            log.warning(f"{stock_code} 入场日期 {entry_date} 无数据")
            return None
        
        
        # 买入价格：开盘价 + 0.5%
        entry_price = round(signal_K.close * 1.005, 2)
        
        # 检查该价格是否在当日能成交（必须 <= 最高价 且 >= 最低价）
        if entry_price > entry_day.high :
            log.info(f"{stock_code} {entry_date} 买入价格 {entry_price} 超过最高价 {entry_day.high}")
            return None
        if  entry_price < entry_day.low:
            log.info(f"{stock_code} {entry_date} 买入价格 {entry_price} 低于最低价 {entry_day.low}")
            return None
        # 检查买入价格是否超过信号K的涨停价
        print(f"{stock_code} {entry_date} 买入价格 {entry_price}，信号K最高价 {signal_K}")
        limit_high_price = round(signal_K.close * 1.1, 2)
        if entry_price > limit_high_price:
            log.info(f"{stock_code} {entry_date} 买入价格 {entry_price} 超过涨停价 {limit_high_price}")
            return None
        
        
        log.info(f"买入 {stock_code} {stock_name} 于 {entry_date}，价格 {entry_price}")
        
        # 检查出场条件
        exit_should, exit_reason, exit_day = check_exit_conditions(
            candlesticks, signal_K, 0
        )
        
        # 如果未出场，则强制在第 lookback_days 天平仓
        if not exit_should or exit_day is None:
            if len(candlesticks) > lookback_days:
                exit_day = candlesticks[lookback_days]
                exit_reason = "force_exit"
                log.info(f"{stock_code} 在向后看 {lookback_days} 个交易日内未主动出场，强制在第{lookback_days}天平仓")
            else:
                # 如果数据不足 lookback_days，则在最后一天平仓
                exit_day = candlesticks[-1]
                exit_reason = "force_exit"
                log.info(f"{stock_code} 数据不足 {lookback_days} 天，在最后一天平仓")
        
        # 计算收益率和持股周期
        profit_pct = (exit_day.close - entry_price) / entry_price
        holding_days = 0
        current_date = entry_date
        while current_date < exit_day.trade_date:
            if is_trading_day(current_date):
                holding_days += 1
            current_date += timedelta(days=1)
        
        exit_date_str = exit_day.trade_date.strftime("%Y%m%d") if isinstance(exit_day.trade_date, date) else exit_day.trade_date
        
        log.info(
            f"出场 {stock_code} {stock_name} 于 {exit_date_str}，"
            f"出场价格 {exit_day.close}，"
            f"收益率 {profit_pct:.2%}，"
            f"持股周期 {holding_days}天，"
            f"出场原因 {exit_reason}"
        )
        
        return TradeRecord(
            stock_code=stock_code,
            stock_name=stock_name,
            signal_date=signal_date,
            entry_date=entry_date.strftime("%Y%m%d"),
            entry_price=entry_price,
            exit_date=exit_date_str,
            exit_price=exit_day.close,
            exit_reason=exit_reason,
            profit_pct=profit_pct,
            holding_days=holding_days
        )
        
    except Exception as e:
        log.error(f"执行交易时发生错误 {stock_code} {stock_name}: {e}", exc_info=True)
        return None


def backtest_with_automation(
    trading_results: list,
    signal_date: str,
    lookback_days: int = 30
) -> list[TradeRecord]:
    """
    对高量突破策略的结果进行自动化交易回测
    
    Args:
        trading_results: 选股结果列表（VolumeBreakoutStrategyExecutingResult）
        signal_date: 信号日期（YYYYMMDD）
        lookback_days: 向后看多少个交易日
    
    Returns:
        成功交易的列表
    """
    successful_trades = []
    
    for result in trading_results:
        # 获取当日的信号K线（使用 signal_date 当日的K线作为参考）
        signal_K_list = nk.get_stock_day_price(
            result.code,
            start_date=signal_date,
            end_date=signal_date
        )
        
        if len(signal_K_list) == 0:
            continue
        
        signal_K = signal_K_list[0]
        
        # 执行交易
        trade_record = execute_trade(
            result.code,
            result.name,
            signal_date,
            signal_K,
            lookback_days
        )
        
        if trade_record is not None:
            successful_trades.append(trade_record)
    
    return successful_trades


def calculate_statistics(trade_records: list[TradeRecord]) -> dict:
    """
    计算交易统计数据
    
    Args:
        trade_records: 交易记录列表
    
    Returns:
        包含以下统计数据的字典：
        - total_trades: 总交易数
        - profitable_trades: 盈利交易数
        - loss_trades: 亏损交易数
        - winning_rate: 胜率
        - avg_profit_pct: 平均收益率
        - total_profit_pct: 总收益率
        - max_profit: 单笔最大收益
        - max_loss: 单笔最大亏损
        - avg_holding_days: 平均持股周期
    """
    if len(trade_records) == 0:
        return {
            "total_trades": 0,
            "profitable_trades": 0,
            "loss_trades": 0,
            "winning_rate": 0,
            "avg_profit_pct": 0,
            "total_profit_pct": 0,
            "max_profit": 0,
            "max_loss": 0,
            "avg_holding_days": 0,
        }
    
    total_trades = len(trade_records)
    profitable_trades = sum(1 for t in trade_records if t.profit_pct > 0)
    loss_trades = total_trades - profitable_trades
    winning_rate = profitable_trades / total_trades if total_trades > 0 else 0
    
    profit_pcts = [t.profit_pct for t in trade_records]
    avg_profit_pct = sum(profit_pcts) / len(profit_pcts) if profit_pcts else 0
    total_profit_pct = sum(profit_pcts)
    max_profit = max(profit_pcts) if profit_pcts else 0
    max_loss = min(profit_pcts) if profit_pcts else 0
    
    holding_days = [t.holding_days for t in trade_records if t.holding_days is not None]
    avg_holding_days = sum(holding_days) / len(holding_days) if holding_days else 0
    
    return {
        "total_trades": total_trades,
        "profitable_trades": profitable_trades,
        "loss_trades": loss_trades,
        "winning_rate": winning_rate,
        "avg_profit_pct": avg_profit_pct,
        "total_profit_pct": total_profit_pct,
        "max_profit": max_profit,
        "max_loss": max_loss,
        "avg_holding_days": avg_holding_days,
    }


def high_volume_breakout_automation_backtrace(
    signal_date: str,
    strategy_results: list,
    lookback_days: int = 30
) -> dict:
    """
    高量突破策略的自动化交易回测
    
    根据选股结果自动执行交易并计算收益率与成功率
    
    Args:
        signal_date: 信号日期（YYYYMMDD）
        strategy_results: 高量突破策略的选股结果列表（VolumeBreakoutStrategyExecutingResult）
        lookback_days: 向后看多少个交易日
    
    Returns:
        包含以下数据的字典：
        - signal_date: 信号日期
        - total_candidates: 候选个股数
        - successful_trades: 成功交易列表
        - failed_trades: 失败交易（无法买入或未出场）的个股信息
        - statistics: 统计数据（胜率、收益率等）
    """
    try:
        log.info(f"开始自动化回测，信号日期: {signal_date}，候选个股: {len(strategy_results)}")
        
        # 执行自动化交易
        successful_trades = backtest_with_automation(
            strategy_results,
            signal_date,
            lookback_days
        )
        
        # 统计未成功的交易
        successful_codes = {t.stock_code for t in successful_trades}
        failed_trades = [
            {
                "code": result.code,
                "name": result.name,
                "reason": "无法买入或未出场"
            }
            for result in strategy_results
            if result.code not in successful_codes
        ]
        
        # 计算统计数据
        statistics = calculate_statistics(successful_trades)
        
        # 记录结果
        log.info(
            f"回测完成 - 信号日期: {signal_date}, "
            f"候选: {len(strategy_results)}, "
            f"成功交易: {len(successful_trades)}, "
            f"胜率: {statistics['winning_rate']:.2%}, "
            f"平均收益: {statistics['avg_profit_pct']:.2%}, "
            f"总收益: {statistics['total_profit_pct']:.2%}"
        )
        
        # 详细记录每笔交易
        for trade in successful_trades:
            log.info(
                f"交易: {trade.stock_code} {trade.stock_name} | "
                f"信号日期: {trade.signal_date} | "
                f"入场: {trade.entry_date}@{trade.entry_price} | "
                f"出场: {trade.exit_date}@{trade.exit_price} | "
                f"收益: {trade.profit_pct:.2%} | "
                f"周期: {trade.holding_days}天 | "
                f"原因: {trade.exit_reason}"
            )
        
        return {
            "signal_date": signal_date,
            "total_candidates": len(strategy_results),
            "successful_trades": successful_trades,
            "failed_trades": failed_trades,
            "statistics": statistics,
        }
        
    except Exception as e:
        log.error(f"自动化回测发生错误: {e}", exc_info=True)
        return {
            "signal_date": signal_date,
            "total_candidates": len(strategy_results),
            "successful_trades": [],
            "failed_trades": [],
            "statistics": {},
        }


"""
高量突破策略的自动化交易回测

根据以上代码结合strategy.high_volume_breakout.py的选股结果，自动执行交易并计算收益率与成功率
"""


def run(signal_date: str):
    global file_handler
    import queue
    from strategy.high_volume_breakout import high_volume_breakout
    if file_handler is not None:
        log.removeHandler(file_handler)

    formatter = logging.Formatter(
        "%(asctime)s - %(levelname)s - %(message)s"
    )

    file_handler = logging.FileHandler(
        f"./trade/log_{signal_date}.log",
        encoding="utf-8"
    )
    file_handler.setFormatter(formatter)

    log.addHandler(file_handler)
    
    
    # 配置参数
    lookback_days = 30        # 向后看30个交易日
    
    # 步骤1：获取高量突破策略的选股结果
    log.info(f"开始获取 {signal_date} 的高量突破策略选股结果...")
    result_queue = queue.Queue()
    high_volume_breakout(
        result_queue,
        start_date=(datetime.strptime(signal_date, "%Y%m%d") - timedelta(days=730)).strftime("%Y%m%d"),
        end_date=signal_date,
        volume_percentile=5
    )
    
    # 收集结果
    strategy_results = []
    item = result_queue.get()
    while item is not None:
        strategy_results.append(item)
        item = result_queue.get()
    
    log.info(f"获取到 {len(strategy_results)} 个选股结果")
    
    if len(strategy_results) == 0:
        log.warning("未获取到选股结果，程序退出")
        exit(1)
    
    # 步骤2：执行自动化交易回测
    log.info("开始自动化交易回测...")
    backtest_result = high_volume_breakout_automation_backtrace(
        signal_date=signal_date,
        strategy_results=strategy_results,
        lookback_days=lookback_days
    )
    
    # 步骤3：输出结果统计
    log.info("=" * 80)
    log.info("自动化交易回测结果统计")
    log.info("=" * 80)
    log.info(f"信号日期: {backtest_result['signal_date']}")
    log.info(f"候选个股: {backtest_result['total_candidates']}")
    log.info(f"成功交易: {len(backtest_result['successful_trades'])}")
    log.info(f"失败交易: {len(backtest_result['failed_trades'])}")
    
    stats = backtest_result['statistics']
    log.info("-" * 80)
    log.info("交易统计指标:")
    log.info(f"  胜率: {stats['winning_rate']:.2%} ({stats['profitable_trades']}/{stats['total_trades']})")
    log.info(f"  平均收益率: {stats['avg_profit_pct']:.2%}")
    log.info(f"  总收益率: {stats['total_profit_pct']:.2%}")
    log.info(f"  最大收益: {stats['max_profit']:.2%}")
    log.info(f"  最大亏损: {stats['max_loss']:.2%}")
    log.info(f"  平均持股周期: {stats['avg_holding_days']:.1f}天")
    log.info("-" * 80)
    
    # 步骤4：详细输出成功交易
    if len(backtest_result['successful_trades']) > 0:
        log.info("成功交易详情:")
        for i, trade in enumerate(backtest_result['successful_trades'], 1):
            log.info(
                f"  {i}. {trade.stock_code} {trade.stock_name}: "
                f"买入{trade.entry_date}@{trade.entry_price}元 → "
                f"卖出{trade.exit_date}@{trade.exit_price}元 | "
                f"收益{trade.profit_pct:.2%} | "
                f"周期{trade.holding_days}天 | "
                f"出场原因{trade.exit_reason}"
            )
    
    # 步骤5：输出失败交易（可选）
    if len(backtest_result['failed_trades']) > 0 and len(backtest_result['failed_trades']) <= 10:
        log.info("失败交易样本 (最多显示10个):")
        for i, trade in enumerate(backtest_result['failed_trades'][:10], 1):
            log.info(f"  {i}. {trade['code']} {trade['name']}: {trade['reason']}")
    
    log.info("=" * 80)
    log.info("自动化交易回测完成")

if __name__ == "__main__":
    signal_dates = ["20250915", "20250916", "20250917","20250918", "20250919"]  # 可替换为任意交易日
    for signal_date in signal_dates:
        run(signal_date)