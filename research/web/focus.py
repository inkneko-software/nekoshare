from datetime import date
from typing import Optional
from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import data.quote as quote
from group_breakout.breakout import *
from group_breakout.strategies.breakout_v1_1 import *
from group_breakout.strategies.high_volume_breakout import *
import queue
import asyncio
import group_breakout.trade_day as trade_day
from datetime import timedelta, date, datetime
from model import *
from group_breakout.strategies.trend import get_rise_trend_line, get_down_trend_line
from group_breakout.strategies import trend
import os
import json
import data.focus as focus
from entity.LimitUpReason import LimitUpReason
from utils.log import LoggerFactory
from entity.StockConcept import StockConcept
log = LoggerFactory.get_logger(__name__)

base_url = "/api/pysdk"

from fastapi import APIRouter

router = APIRouter()

data = None
@router.get(base_url + "/focus/get_transaction")
def get_transaction(date: str):
    """
    获取指定日期的龙虎榜信息

    :param date: 日期
    :return: 
    """
    return focus.get_lhb_stock_list_by_date(date)

@router.get(base_url + "/focus/get_transaction_info")
def get_transaction_info(stock_code: str, date: str):
    """
    获取个股指定日期的龙虎榜信息

    :param code: 股票代码
    :return: 
    """
    return focus.get_lhb_stock_detail(stock_code, date)


@dataclass
class HotMoneyTransaction:
    hot_money_name: str
    stock_code: str
    stock_name: str
    net_value: float

@router.get(base_url + "/focus/get_hot_money_transaction")
def get_hot_money_transaction(date: str) -> list[HotMoneyTransaction]:
    """
    获取游资某日的交易动向

    :param date: 日期
    :return: 字典类型，分别为买入和卖出榜。
    """
    ret = []
    # 获取席位与游资名称映射
    hot_money_list = focus.get_hot_money_list()
    hot_money_dict = {}
    for hot_money in hot_money_list:
        hot_money_dict[hot_money.department_name] = hot_money.hot_money_name
        
    stock_list = focus.get_lhb_stock_list_by_date(date)
    for stock in stock_list:
        if stock.stock_name.startswith(("*ST", "ST")) or stock.stock_name.find("转债") != -1 or stock.stock_name.find("退") != -1 or stock.stock_name.find("B") != -1:
            continue
        if stock.range_days != 1:
            continue
        
        transaction_detail = focus.get_lhb_stock_detail(stock.stock_code, date)

        # 基于营业部合并买入与卖出数据，格式为 席位: 净买金额
        concated_transaction = {}
        for transaction in transaction_detail:
            if stock.stock_code.startswith("6"):
                #如果是上证则需要计算净买量
                if transaction.trade_type == "buy":
                    concated_transaction[transaction.name] = concated_transaction.get(transaction.name, 0) + transaction.buy_value
                elif transaction.trade_type == "sell":
                    concated_transaction[transaction.name] = concated_transaction.get(transaction.name, 0) - transaction.sell_value
            else:
                #如果是深证则直接使用净买金额
                if concated_transaction.get(transaction.name) == None:
                    concated_transaction[transaction.name] = transaction.net_value

        # 基于游资名称进行合并，格式为 游资名称: 净买金额
        concated_transaction_by_hot_money = {}

        for department_name, net_value in concated_transaction.items():
            hot_money_name = hot_money_dict.get(department_name)
            if hot_money_name != None:
                concated_transaction_by_hot_money[hot_money_name] = concated_transaction_by_hot_money.get(hot_money_name, 0) + net_value
        
        for hot_money_name, net_value in concated_transaction_by_hot_money.items():
            if hot_money_name == 'T王':
                continue

            ret.append(HotMoneyTransaction(
                hot_money_name=hot_money_name,
                stock_code=stock.stock_code,
                stock_name=stock.stock_name,
                net_value=net_value
            ))
    return ret

@router.get(base_url + "/focus/get_limit_up_reason")
def get_limit_up_reason(date: str) -> list[LimitUpReason]:
    """
    获取某日的涨停原因列表

    :param date: 日期
    :return: 涨停原因列表
    """
    limit_up_reasons = focus.get_limit_up_reason_list(date)
    return limit_up_reasons

@router.get(base_url + "/focus/get_stock_concept")
def get_stock_concept(stock_code: str) -> list[StockConcept]:
    """
    获取个股的概念列表

    :param stock_code: 股票代码
    :return: 个股概念列表
    """
    stock_concepts = focus.get_stock_concept_list(stock_code)
    return stock_concepts

@router.get(base_url + "/focus/get_advance_decline_count")
def get_advance_decline_count(start_date: str, end_date: str):
    """
    获取指定时间范围内每日的涨跌家数

    :param start_date: 开始日期 YYYY-MM-DD
    :param end_date: 结束日期 YYYY-MM-DD
    :return: 每日涨跌家数列表
    """
    df = focus.get_advance_decline_count(start_date, end_date)
    return json.loads(df.to_json(orient='records'))