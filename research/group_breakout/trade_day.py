from datetime import datetime, timedelta, date

def get_latest_trading_day(now: datetime | None = None) -> date:
    if now is None:
        now = datetime.now()

    # 定义节假日范围（2025年）
    holidays = [
        # 元旦
        (date(2025, 1, 1), date(2025, 1, 1)),
        # 春节
        (date(2025, 1, 28), date(2025, 2, 4)),
        # 清明节
        (date(2025, 4, 4), date(2025, 4, 6)),
        # 劳动节
        (date(2025, 5, 1), date(2025, 5, 5)),
        # 端午节
        (date(2025, 5, 31), date(2025, 6, 2)),
        # 国庆节 + 中秋节
        (date(2025, 10, 1), date(2025, 10, 8)),
    ]

    # 周末调休休市
    extra_weekends = [
        date(2025, 1, 26),
        date(2025, 2, 8),
        date(2025, 4, 27),
        date(2025, 9, 28),
        date(2025, 10, 11),
    ]

    # 辅助函数：判断是否为交易日
    def is_trading_day(d: date) -> bool:
        # 周末排除
        if d.weekday() >= 5:
            return False
        # 节假日排除
        for start, end in holidays:
            if start <= d <= end:
                return False
        # 调休周末排除
        if d in extra_weekends:
            return False
        return True

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

    # 定义节假日范围（2025年）
    holidays = [
        # 元旦
        (date(2025, 1, 1), date(2025, 1, 1)),
        # 春节
        (date(2025, 1, 28), date(2025, 2, 4)),
        # 清明节
        (date(2025, 4, 4), date(2025, 4, 6)),
        # 劳动节
        (date(2025, 5, 1), date(2025, 5, 5)),
        # 端午节
        (date(2025, 5, 31), date(2025, 6, 2)),
        # 国庆节 + 中秋节
        (date(2025, 10, 1), date(2025, 10, 8)),
    ]

    # 周末调休休市
    extra_weekends = [
        date(2025, 1, 26),
        date(2025, 2, 8),
        date(2025, 4, 27),
        date(2025, 9, 28),
        date(2025, 10, 11),
    ]

    # 辅助函数：判断是否为交易日
    def is_trading_day(d: date) -> bool:
        # 周末排除
        if d.weekday() >= 5:
            return False
        # 节假日排除
        for start, end in holidays:
            if start <= d <= end:
                return False
        # 调休周末排除
        if d in extra_weekends:
            return False
        return True
    
    current = current + timedelta(days=1)
    if is_trading_day(current):
        return current
    
    return get_next_trading_day(current)