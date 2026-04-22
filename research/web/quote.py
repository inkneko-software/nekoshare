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
# class Input(BaseModel):
#     a: float
#     b: float

from utils.log import LoggerFactory
log = LoggerFactory.get_logger(__name__)

base_url = "/api/pysdk"

from fastapi import APIRouter

router = APIRouter()
@router.get(base_url + "/stock/getStockInfo")
def get_stock_info(code: str):
    """
    获取指定股票的股票信息

    :param code: 股票代码
    :return: 
    """
    stock = quote.get_stock_data(code)
    if stock == None:
        return JSONResponse(status_code=404, content={"message": "代码不存在"})
    return {"data": stock}

@router.get(base_url + "/stock/getStockDayPrice")
def add(code: str, start_date: str = "20140101", end_date: str = None, start_delta: int = None):
    """
    获取指定股票的日线价格数据

    :param code: 股票代码
    :param start_date: 起始日期，格式为 'YYYY-MM-DD'
    :param end_date: 结束日期，格式为 'YYYY-MM-DD'，若start_delta不为None，则本参数将被忽略
    :param start_delta: 起始时间偏移量，默认为 None，表示不偏移。通过本参数可以获取从start_date开始，以及后start_delta个交易日的数据

    :return: 定义见代码
    """
    start_date = datetime.strptime(start_date, "%Y%m%d").date()
    if start_delta != None and start_delta > 0:
        end_date = start_date
        for i in range(start_delta):
            end_date = trade_day.get_next_trading_day(end_date)
    # 获取股票日线价格数据
    prices = quote.get_stock_day_price(code, start_date, end_date)
    return {"data": prices}

@router.get(base_url + "/ths/getIndustryDayPrice")
def get_industry_day_price(code: str, start_date: str = "20140101", end_date: str = "20990101", start_delta: int = None):
    """
    获取指定行业日线价格数据

    :param code: 行业代码
    :param start_date: 起始日期，格式为 'YYYY-MM-DD'
    :param end_date: 结束日期，格式为 'YYYY-MM-DD'，若start_delta不为None，则本参数将被忽略
    :param start_delta: 起始时间偏移量，默认为 None，表示不偏移。通过本参数可以获取从start_date开始，以及后start_delta个交易日的数据
    :return: 
    """
    start_date = datetime.strptime(start_date, "%Y%m%d").date()
    if start_delta != None and start_delta > 0:
        end_date = start_date
        for i in range(start_delta):
            end_date = trade_day.get_next_trading_day(end_date)
    prices = quote.get_ths_industry_day_price(code, start_date, end_date)
    return {"data": prices}

@router.get(base_url + "/ths/getIndustry")
def fetch_industry_market(code: str):
    """
    获取指定行业最新行情
    """
    thsIndustryDayPrice = quote.get_ths_industry_day_price(code, latest=True)
    if len(thsIndustryDayPrice) == 0:
        return JSONResponse(status_code=404, content={"message": "行业不存在"})
    return {"data": thsIndustryDayPrice[0]}

