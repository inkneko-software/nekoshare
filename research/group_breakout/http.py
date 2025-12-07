from datetime import date
from typing import Optional
from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import uvicorn
import group_breakout.fetch as nk
from group_breakout.breakout import *
from group_breakout.strategies.breakout_v1_1 import *
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

app = FastAPI()
base_url = "/api/pysdk"

@app.get(base_url + "/stock/getStockInfo")
def get_stock_info(code: str):
    """
    获取指定股票的股票信息

    :param code: 股票代码
    :return: 
    """
    stock = nk.get_stock_data(code)
    if stock == None:
        return JSONResponse(status_code=404, content={"message": "代码不存在"})
    return {"data": stock}

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

@app.get(base_url + "/ths/getIndustry")
def fetch_industry_market(code: str):
    """
    获取指定行业最新行情
    """
    thsIndustryDayPrice = nk.get_ths_industry_day_price(code, latest=True)
    if len(thsIndustryDayPrice) == 0:
        return JSONResponse(status_code=404, content={"message": "行业不存在"})
    return {"data": thsIndustryDayPrice[0]}

@app.get(base_url + "/fetch/getFetchLog")
def get_fetch_log(job_type: str, count: int = None):
    """
    获取爬虫状态信息

    """
    if job_type != "ths_industry_quote" and job_type != "tdx_stocks_quote":
        raise HTTPException(status_code=400, detail="无效的爬虫任务类型")
    
    return {"data": nk.get_fetch_log(job_type, count)}
    
    



class TimeRange(BaseModel):
    start_date: str
    end_date: str

@app.websocket("/ws/breakout_execution")
async def websocket_endpoint(websocket: WebSocket):
    # 接受客户端连接
    await websocket.accept()
    data = await websocket.receive_json()
    timeRange = TimeRange(**data)

    resultQueue: queue.Queue[BreakoutStrategyExecutingResult] = queue.Queue()
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, breakout, resultQueue, timeRange.start_date, timeRange.end_date)
    while True:
        msg = await asyncio.to_thread(resultQueue.get)
        if msg == None:
            break
        await websocket.send_text(msg.model_dump_json())
    await websocket.close()


@app.websocket("/ws/breakout_backtrace")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    data = await websocket.receive_json()  # 收到客户端发来的消息
    timeRange = TimeRange(**data)

    resultQueue: queue.Queue[BacktraceResult] = queue.Queue()
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, breakout_backtrace, resultQueue, timeRange.start_date, timeRange.end_date)
    while True:
        elem = await asyncio.to_thread(resultQueue.get)
        if elem == None:
            break
        await websocket.send_text(elem.model_dump_json())
    await websocket.close()

@app.websocket("/ws/breakout_v1_1_execution")
async def websocket_endpoint(websocket: WebSocket):
    # 接受客户端连接
    await websocket.accept()
    data = await websocket.receive_json()
    timeRange = TimeRange(**data)

    resultQueue: queue.Queue[BreakoutStrategyExecutingResult] = queue.Queue()
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, breakout_v1_1, resultQueue, timeRange.start_date, timeRange.end_date)
    while True:
        msg = await asyncio.to_thread(resultQueue.get)
        if msg == None:
            break
        await websocket.send_text(msg.model_dump_json())
    await websocket.close()

@app.websocket("/ws/breakout_v1_1_backtrace")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    data = await websocket.receive_json()  # 收到客户端发来的消息
    timeRange = TimeRange(**data)

    resultQueue: queue.Queue[BacktraceResult] = queue.Queue()
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, breakout_v1_1_backtrace, resultQueue, timeRange.start_date, timeRange.end_date)
    while True:
        elem = await asyncio.to_thread(resultQueue.get)
        if elem == None:
            break
        await websocket.send_text(elem.model_dump_json())
    await websocket.close()

@app.websocket("/ws/breakout_trend")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    data = await websocket.receive_json()  # 收到客户端发来的消息
    timeRange = TimeRange(**data)

    resultQueue: queue.Queue[BacktraceResult] = queue.Queue()
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, trend.breakout, resultQueue, timeRange.start_date, timeRange.end_date)
    while True:
        elem = await asyncio.to_thread(resultQueue.get)
        if elem == None:
            break
        await websocket.send_text(elem.model_dump_json())
    await websocket.close()

@app.get(base_url + "/stock/getTrendLines")
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

@app.get(base_url + "/ths/getTrendLines")
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



if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3010)
