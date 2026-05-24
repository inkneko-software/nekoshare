import json

from datetime import date, datetime, timedelta
from data.MySQLConnectionPool import MySQLConnectionPool
import time
import pandas as pd
import os

from entity.THSIndustry import THSIndustry
from entity.THSIndustryDayPrice import THSIndustryDayPrice
from entity.THSIndustryStock import THSIndustryStock
from entity.StockData import StockData
from entity.THSIndustryMarket import THSIndustryMarket
from entity.StockDayPrice import StockDayPrice
from group_breakout import trade_day
from sqlalchemy import create_engine
import pandas as pd
import warnings
import redis
from entity.HotMoney import HotMoney
from entity.LhbStockDetail import LhbStockDetail
from entity.LhbStockList import Concept, LhbStockList
from entity.LimitUpReason import LimitUpReason
from entity.StockConcept import StockConcept
import data.cache as cache

from utils.log import LoggerFactory

log = LoggerFactory.get_logger(__name__)

redis_host = os.environ.get("REDIS_HOST")
redis_port = os.environ.get("REDIS_PORT")


def get_hot_money_departments(hot_money_name: str) -> list[str]:
    """
    获取指定游资相关的营业部列表

    :param hot_money_name: 游资名称
    :return: 营业部列表
    """

    pool = MySQLConnectionPool()

    result = pool.query(
        "SELECT department_name FROM hot_money WHERE hot_money_name = %s",
        (hot_money_name,)
    )
    departments = [row[0] for row in result]
    return departments

def get_hot_money_name_by_department(department_name: str) -> str:
    """
    获取指定营业部相关的游资名称

    :param department_name: 营业部名称
    :return: 游资名称
    """

    pool = MySQLConnectionPool()

    result = pool.query(
        "SELECT hot_money_name FROM hot_money WHERE department_name = %s",
        (department_name,)
    )
    if result:
        return result[0][0]
    else:
        return None
    
def get_all_hot_money_names() -> list[str]:
    """
    获取所有游资名称列表

    :return: 游资名称列表
    """

    pool = MySQLConnectionPool()

    result = pool.query(
        "SELECT DISTINCT hot_money_name FROM hot_money"
    )
    hot_money_names = [row[0] for row in result]
    return hot_money_names

def get_hot_money_list() -> list[HotMoney]:
    """
    获取所有游资列表

    :return: 游资列表
    """

    pool = MySQLConnectionPool()

    result = pool.query(
        "SELECT department_name, hot_money_name FROM hot_money"
    )
    hot_money_list = []
    for row in result:
        hot_money_list.append(HotMoney(
            department_name=row[0],
            hot_money_name=row[1]
        ))
    return hot_money_list

def get_lhb_stock_list_by_date(date: str) -> list[LhbStockList]:
    """
    获取指定日期的龙虎榜个股列表

    :param date: 日期
    :return: 龙虎榜个股列表
    """

    pool = MySQLConnectionPool()

    result = pool.query(
        "SELECT id, trade_date, stock_code, stock_name, range_days, reason_list, buy_value, sell_value, net_value, hot_money_net_value, org_net_value, limit_reason, concept_list FROM lhb_stock_list WHERE trade_date = %s",
        (date,)
    )
    lhb_stock_list = []
    for row in result:
        lhb_stock_list.append(LhbStockList(
            id=row[0],
            trade_date=row[1],
            stock_code=row[2],
            stock_name=row[3],
            range_days=row[4],
            reason_list=json.loads(row[5]),
            buy_value=float(row[6]),
            sell_value=float(row[7]),
            net_value=float(row[8]),
            hot_money_net_value=float(row[9]),
            org_net_value=float(row[10]),
            limit_reason=row[11],
            concept_list=[Concept(code=concept['code'], name=concept['name']) for concept in json.loads(row[12])]
        ))
    return lhb_stock_list

def get_lhb_stock_detail(stock_code: str, date: str) -> list[LhbStockDetail]:
    """
    获取指定日期和股票代码的龙虎榜个股详情

    :param stock_code: 股票代码
    :param date: 日期
    :return: 龙虎榜个股详情列表
    """

    pool = MySQLConnectionPool()

    result = pool.query(
        "SELECT id, trade_date, stock_code, stock_name, range_days, trade_type, name, short_name, buy_value, sell_value, net_value FROM lhb_stock_detail WHERE trade_date = %s AND stock_code = %s",
        (date, stock_code)
    )
    lhb_stock_details = []
    for row in result:
        lhb_stock_details.append(LhbStockDetail(
            id=row[0],
            trade_date=row[1],
            stock_code=row[2],
            stock_name=row[3],
            range_days=row[4],
            trade_type=row[5],
            name=row[6],
            short_name=row[7],
            buy_value=float(row[8]),
            sell_value=float(row[9]),
            net_value=float(row[10])
        ))
    return lhb_stock_details

def get_limit_up_reason_list(date: str) -> list[LimitUpReason]:
    """
    获取指定日期和股票代码的涨停原因

    :param stock_code: 股票代码
    :param date: 日期
    :return: 涨停原因
    """

    pool = MySQLConnectionPool()
    result = pool.query(
        "SELECT id, trade_date, stock_code, stock_name, limit_up_type, reason_type, change_rate, turnover_rate, high_days, first_limit_up_time, last_limit_up_time FROM limit_up_reason WHERE trade_date = %s",
        (date,)
    )
    limit_up_reasons = []
    for row in result:
        limit_up_reasons.append(LimitUpReason(
            id=row[0],
            trade_date=row[1],
            stock_code=row[2],
            stock_name=row[3],
            limit_up_type=row[4],
            reason_type=row[5],
            change_rate=float(row[6]),
            turnover_rate=float(row[7]),
            high_days=row[8],
            first_limit_up_time=str(row[9]),
            last_limit_up_time=str(row[10])
        ))
    return limit_up_reasons

def get_stock_concept_list(stock_code: str) -> list[StockConcept]:
    """
    获取指定股票代码的概念列表

    :param stock_code: 股票代码
    :return: 概念列表
    """

    pool = MySQLConnectionPool()
    result = pool.query(
        "SELECT id, stock_code, stock_name, concept_code, concept_name, `explain`, weight FROM stock_concept WHERE stock_code = %s ORDER BY weight DESC",
        (stock_code,)
    )
    concept_list = []
    for row in result:
        concept_list.append(StockConcept(
            id=row[0],
            stock_code=row[1],
            stock_name=row[2],
            concept_code=row[3],
            concept_name=row[4],
            explain=row[5],
            weight=row[6]
        ))
    return concept_list

def get_advance_decline_count(start_date: str, end_date: str) -> pd.DataFrame:
    """
    获取指定时间范围内每日的涨跌家数，以日为粒度缓存到Redis

    :param start_date: 开始日期，格式YYYY-MM-DD
    :param end_date: 结束日期，格式YYYY-MM-DD
    :return: 包含trade_date, advance_count, decline_count, flat_count的DataFrame
    """

    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    if end - start > timedelta(days=31):
        return pd.DataFrame(columns=['trade_date', 'advance_count', 'decline_count', 'flat_count'])

    dates = [(start + timedelta(days=i)).strftime("%Y-%m-%d") for i in range((end - start).days + 1)]

    # 尝试从Redis缓存获取每日数据
    r = redis.Redis(host=redis_host, port=int(redis_port), decode_responses=True)
    cached = r.mget([f"advance_decline:{d}" for d in dates])

    results = {}
    uncached_dates = []
    for i, val in enumerate(cached):
        if val is not None:
            results[dates[i]] = json.loads(val)
        else:
            uncached_dates.append(dates[i])

    # 查询MySQL中缺失的日期
    if uncached_dates:
        pool = MySQLConnectionPool()
        placeholders = ','.join(['%s'] * len(uncached_dates))
        rows = pool.query(
            f"SELECT trade_date, percent_change FROM stock_day_price WHERE trade_date IN ({placeholders})",
            tuple(uncached_dates)
        )

        # 按日期分组计数
        day_data = {}
        for row in rows:
            d = str(row[0])
            if d not in day_data:
                day_data[d] = {'advance': 0, 'decline': 0, 'flat': 0}
            pct = row[1]
            if pct > 0:
                day_data[d]['advance'] += 1
            elif pct < 0:
                day_data[d]['decline'] += 1
            else:
                day_data[d]['flat'] += 1

        for d in uncached_dates:
            d_date = datetime.strptime(d, "%Y-%m-%d").date()
            counts = day_data.get(d, {'advance': 0, 'decline': 0, 'flat': 0})
            results[d] = counts

            # 未来日期不缓存
            if d_date > trade_day.get_latest_trading_day():
                continue

            # 当前交易日数据仍在更新，缓存15分钟；其余缓存24小时
            ttl = 900 if d_date == trade_day.get_latest_trading_day() else 86400
            r.setex(f"advance_decline:{d}", ttl, json.dumps(counts))

    result_df = pd.DataFrame([
        {'trade_date': d, 'advance_count': results[d]['advance'],
         'decline_count': results[d]['decline'], 'flat_count': results[d]['flat']}
        for d in dates
    ])
    result_df = result_df[(result_df['advance_count'] != 0) | (result_df['decline_count'] != 0) | (result_df['flat_count'] != 0)]
    return result_df


if __name__ == "__main__":
    for month in range(1, 13):
        start = f"2025-{month:02d}-01"
        if month == 12:
            end = "2025-12-31"
        else:
            end = f"2025-{month+1:02d}-01"
        df = get_advance_decline_count(start, end)
        print(f"\n=== {start} ~ {end} ===")
        print(df.to_string(index=False))