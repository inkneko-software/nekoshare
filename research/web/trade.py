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
from trade.automation import TradeHistory, tradeNextDay_v2
import os
import json
import re
from pathlib import Path
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
    results = tradeNextDay_v2(date)
    return results


@router.get(base_url + "/trade/getBacktestOverview")
def getBacktestOverview():
    """
    读取 output 目录下所有 breakout_result_{date}.log 和 backtrace_result_{date}.log，
    按日期聚合返回回测概览数据。
    """
    output_dir = Path("output")
    if not output_dir.exists():
        return {"data": {}}

    data: dict[str, dict] = {}

    # 扫描所有 .log 文件
    for fpath in sorted(output_dir.iterdir()):
        if not fpath.suffix == ".log":
            continue
        m = re.match(r"(breakout|backtrace)_result_(\d{8})\.log", fpath.name)
        if not m:
            continue
        file_type = m.group(1)
        date_key = m.group(2)

        if date_key not in data:
            data[date_key] = {}

        try:
            content = fpath.read_text(encoding="utf-8")
            records = json.loads(content)
        except Exception as e:
            log.warning(f"读取文件 {fpath.name} 失败: {e}")
            records = []

        if file_type == "breakout":
            data[date_key]["breakout_count"] = len(records)
            data[date_key]["breakout_stocks"] = records
        elif file_type == "backtrace":
            data[date_key]["backtrace_count"] = len(records)
            data[date_key]["backtrace_stocks"] = records

            if records:
                change_pcts = [r["change_pct"] for r in records]
                data[date_key]["total_return"] = sum(change_pcts)
                data[date_key]["avg_return"] = sum(change_pcts) / len(change_pcts)
                data[date_key]["max_profit"] = max(change_pcts)
                data[date_key]["max_drawdown"] = min(change_pcts)
            else:
                data[date_key]["total_return"] = 0
                data[date_key]["avg_return"] = 0
                data[date_key]["max_profit"] = 0
                data[date_key]["max_drawdown"] = 0

    return {"data": data}
