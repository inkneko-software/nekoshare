from datetime import datetime, timedelta, date
from chinese_calendar import is_holiday
def is_trading_day(d: date) -> bool:
    """
    判断给定的日期是否是交易日
    """
    if d.weekday() >= 5 or is_holiday(d):
        return False
    return True
def get_latest_trading_day(now: datetime | None = None) -> date:
    """
    获取当前最新的交易日。如果当日是交易日但是处于9:15之前，则退回上一交易日
    """
    if now is None:
        now = datetime.now()

    today = now.date()

    # 如果当天是交易日但在9:15之前，则退回上一交易日
    if is_trading_day(today) and now.time() < datetime.strptime("09:15", "%H:%M").time():
        today -= timedelta(days=1)

    # 回退到最近的交易日
    while not is_trading_day(today):
        today -= timedelta(days=1)

    return today

def get_next_trading_day(current: date):
    """
    获取下一个交易日
    """
    
    current = current + timedelta(days=1)
    if is_trading_day(current):
        return current
    
    return get_next_trading_day(current)

def get_prev_trading_day(current: date):
    """
    获取上一个交易日
    """
    
    current = current - timedelta(days=1)
    if is_trading_day(current):
        return current
    
    return get_prev_trading_day(current)