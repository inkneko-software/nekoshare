from datetime import date
from typing import Optional
from fastapi import FastAPI, WebSocket
from pydantic import BaseModel
import uvicorn
import group_breakout.fetch as nk
from group_breakout.breakout import *
import queue
import asyncio
# class Input(BaseModel):
#     a: float
#     b: float

app = FastAPI()
base_url = "/api/pysdk"


@app.get(base_url + "/stock/getStockDayPrice")
def add(code: str, start_date: str = "20140101", end_date: str = None):
    prices = nk.get_stock_day_price(code, start_date, end_date)
    return {"data": prices}

@app.get(base_url + "/ths/getIndustryDayPrice")
def get_industry_day_price(code: str, start_date: str = "20140101", end_date: str = "20990101"):
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
    uvicorn.run(app, host="127.0.0.1", port=3010)
