from datetime import date
from typing import Optional
from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import group_breakout.fetch as nk
from strategy.high_volume_breakout import *
import queue
import asyncio
import group_breakout.trade_day as trade_day
from datetime import timedelta, date, datetime
from model import *
from group_breakout.strategies.trend import get_rise_trend_line, get_down_trend_line
from group_breakout.strategies import trend
# class Input(BaseModel):
#     a: float
#     b: float

from utils.log import LoggerFactory
log = LoggerFactory.get_logger(__name__)

base_url = "/api/pysdk"

from fastapi import APIRouter

router = APIRouter()

class TimeRange(BaseModel):
    start_date: str
    end_date: str


@router.get(base_url + "/stock/getTrendLines")
def add(code: str, start_date: str = "20140101", end_date: str = None):
    """
    获取指定股票的趋势线数据

    :param code: 股票代码
    :param start_date: 起始日期，格式为 'YYYYMMDD'
    :param end_date: 结束日期，格式为 'YYYYMMDD'

    :return: 定义见代码
    """
    start_date = datetime.strptime(start_date, "%Y%m%d").date()
    if end_date == None:
        end_date = trade_day.get_latest_trading_day()
    else:
        end_date = datetime.strptime(end_date, "%Y%m%d").date()
    # 获取股票日线价格数据
    candlesticks = nk.get_stock_day_price(code, start_date, end_date)
    if len(candlesticks) == 0:
        return JSONResponse(status_code=404, content={"message": "代码不存在或无日线数据"})
    trend_lines = get_down_trend_line(candlesticks)
    return {"data": trend_lines}

@router.get(base_url + "/ths/getTrendLines")
def add(code: str, start_date: str = "20140101", end_date: str = None):
    """
    获取指定股票的趋势线数据

    :param code: 股票代码
    :param start_date: 起始日期，格式为 'YYYYMMDD'
    :param end_date: 结束日期，格式为 'YYYYMMDD'

    :return: 定义见代码
    """
    start_date = datetime.strptime(start_date, "%Y%m%d").date()
    if end_date == None:
        end_date = trade_day.get_latest_trading_day()
    else:
        end_date = datetime.strptime(end_date, "%Y%m%d").date()
    # 获取股票日线价格数据
    candlesticks = nk.get_ths_industry_day_price(code, start_date, end_date)
    if len(candlesticks) == 0:
        return JSONResponse(status_code=404, content={"message": "代码不存在或无日线数据"})
    trend_lines = get_down_trend_line(candlesticks)
    return {"data": trend_lines}

@router.websocket("/ws/volume_breakout_execution")
async def websocket_endpoint(websocket: WebSocket):
    # 接受客户端连接
    await websocket.accept()
    data = await websocket.receive_json()
    timeRange = TimeRange(**data)

    resultQueue: queue.Queue[VolumeBreakoutStrategyExecutingResult] = queue.Queue()
    loop = asyncio.get_running_loop()
    two_years_ago = (datetime.strptime(timeRange.end_date, "%Y%m%d") - relativedelta(years=1) - relativedelta(days=180)).strftime("%Y%m%d")

    loop.run_in_executor(None, high_volume_breakout, resultQueue, two_years_ago, timeRange.end_date)
    while True:
        msg = await asyncio.to_thread(resultQueue.get)
        if msg == None:
            break
        await websocket.send_text(msg.model_dump_json())
    await websocket.close()
