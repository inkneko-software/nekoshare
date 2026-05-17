import json

from datetime import date, datetime
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

import data.cache as cache

from utils.log import LoggerFactory

log = LoggerFactory.get_logger(__name__)


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

if __name__ == "__main__":
    print(get_limit_up_reason_list("2026-03-25"))