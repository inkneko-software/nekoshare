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
from trade.automation import TradeHistory, tradeNextDay
import os
# class Input(BaseModel):
#     a: float
#     b: float

from utils.log import LoggerFactory
log = LoggerFactory.get_logger(__name__)

base_url = "/api/pysdk"

from fastapi import APIRouter
router = APIRouter()

@router.get(base_url + "/trade/getTradeResults")
def getTradeResults(date: str = None) -> list[TradeHistory]:
    """
    获取某日的高量突破结果，并回测后10个交易日的表现

    买入条件为 如果高开，则高开向上1%买入，如果平开或低开，需要在价格大于昨日最高价1%的时候买入

    离场条件为收盘价跌破5日线，或者跌停。如果10个交易日仍未离场，则在第10个交易日收盘离场
    """
    results = tradeNextDay(date)
    return results
