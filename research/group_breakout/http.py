from datetime import date
from typing import Optional
from fastapi import FastAPI, WebSocket
from pydantic import BaseModel
import uvicorn
import group_breakout.fetch as nk
from group_breakout.breakout import *
import queue
import asyncio
import group_breakout.trade_day as trade_day
from datetime import timedelta, date, datetime
import os
# class Input(BaseModel):
#     a: float
#     b: float

from utils.log import LoggerFactory
log = LoggerFactory.get_logger(__name__)

app = FastAPI()
base_url = "/api/pysdk"


@app.get(base_url + "/stock/getStockDayPrice")
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
    prices = nk.get_stock_day_price(code, start_date, end_date)
    return {"data": prices}

@app.get(base_url + "/ths/getIndustryDayPrice")
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
    prices = nk.get_ths_industry_day_price(code, start_date, end_date)
    return {"data": prices}

@app.get(base_url + "/ths/fetch_industry_market")
def fetch_industry_market():
    nk.fetch_and_save(True)
    return {"code": 200, "msg": "ok"}


class TimeRange(BaseModel):
    start_date: str
    end_date: str

@app.websocket("/ws/breakout_execution")
async def websocket_endpoint(websocket: WebSocket):
    # 接受客户端连接
    await websocket.accept()
    data = await websocket.receive_json()  # 收到客户端发来的消息
    timeRange = TimeRange(**data)

    resultQueue = queue.Queue()
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, breakout, resultQueue, timeRange.start_date, timeRange.end_date)
    while True:
        msg = await asyncio.to_thread(resultQueue.get)
        if msg == None:
            break
        await websocket.send_text(msg)
    await websocket.close()

@app.websocket("/ws/breakout_backtrace")
async def websocket_endpoint(websocket: WebSocket):
    # 接受客户端连接
    await websocket.accept()
    data = await websocket.receive_text()  # 收到客户端发来的消息

    resultQueue = queue.Queue()
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, breakout, resultQueue)
    while True:
        msg = await asyncio.to_thread(resultQueue.get)
        if msg == None:
            break
        await websocket.send_text(msg)
    await websocket.close()


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3010)
