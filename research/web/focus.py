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

from utils.log import LoggerFactory
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
    global data
    if not data:
        with open('../../nekoshare-data/transaction_info/transaction_list.txt', 'r', encoding='utf-8') as f:
            data = f.readlines()
    
    for line in data:
        record_date, record = line.split(' | ')
        if record_date == date:
            return json.loads(record)

    return JSONResponse(status_code=404, content={"message": "指定日期暂无龙虎榜信息"})

@router.get(base_url + "/focus/get_transaction_info")
def get_transaction_info(stock_code: str, date: str):
    """
    获取个股指定日期的龙虎榜信息

    :param code: 股票代码
    :return: 
    """
    req_date = datetime.strptime(date, '%Y-%m-%d')
    with open(f'../../nekoshare-data/transaction_info/transaction_info_{req_date.strftime("%Y-%m-%d")}.txt', 'r', encoding='utf-8') as f:
        data = f.readlines()
    
    for line in data:
        record_code, record = line.split(' | ')
        if record_code == stock_code:
            return json.loads(record)

    return JSONResponse(status_code=404, content={"message": "指定日期暂无龙虎榜信息"})

@router.get(base_url + "/focus/get_hot_money_transaction")
def get_hot_money_transaction(date: str):
    """
    获取游资某日的交易动向
    """
    req_date = datetime.strptime(date, '%Y-%m-%d')
    with open(f'../../nekoshare-data/transaction_info/transaction_info_{req_date.strftime("%Y-%m-%d")}.txt', 'r', encoding='utf-8') as f:
        data = f.readlines()
    one_day = {}
    three_day = {}
    for line in data:
        record_code, record = line.split(' | ')
        record = json.loads(record)
        record = record['data']
        stock_name = record['stock_name']
        one_day_transactions = record['details']['one']
        three_day_transactions = record['details']['three']
        if len(one_day_transactions) != 0:
            # 如果一日榜有多个数据，则暂时只取第一个
            one_day_transactions = one_day_transactions[0]
            for buy_item in one_day_transactions['buy_items']:
                if len(buy_item['hot_money']) != 0:
                    hot_money = buy_item['hot_money'][0]
                    hot_money_name = hot_money['name']
                    if one_day.get(hot_money_name) is None:
                        one_day[hot_money_name] = {}

                    if one_day[hot_money_name].get(stock_name) is None:
                        one_day[hot_money_name][stock_name] = {}
                        one_day[hot_money_name][stock_name]['buy_value'] = 0
                        one_day[hot_money_name][stock_name]['sell_value'] = 0
                    one_day[hot_money_name][stock_name]['buy_value'] += buy_item['buy_value']
                    if buy_item['sell_value'] is not None:
                        one_day[hot_money_name][stock_name]['sell_value'] += buy_item['sell_value']
            
            for sell_item in one_day_transactions['sell_items']:
                if len(sell_item['hot_money']) != 0:
                    hot_money = sell_item['hot_money'][0]
                    hot_money_name = hot_money['name']
                    if one_day.get(hot_money_name) is None:
                        one_day[hot_money_name] = {}

                    if one_day[hot_money_name].get(stock_name) is None:
                        one_day[hot_money_name][stock_name] = {}
                        one_day[hot_money_name][stock_name]['buy_value'] = 0
                        one_day[hot_money_name][stock_name]['sell_value'] = 0
                    one_day[hot_money_name][stock_name]['sell_value'] += sell_item['sell_value']
                    if sell_item['buy_value'] is not None:
                        one_day[hot_money_name][stock_name]['buy_value'] += sell_item['buy_value']

        if len(three_day_transactions) != 0:
            # 如果一日榜有多个数据，则暂时只取第一个
            three_day_transactions = three_day_transactions[0]
            for buy_item in three_day_transactions['buy_items']:
                if len(buy_item['hot_money']) != 0:
                    hot_money = buy_item['hot_money'][0]
                    hot_money_name = hot_money['name']
                    if three_day.get(hot_money_name) is None:
                        three_day[hot_money_name] = {}

                    if three_day[hot_money_name].get(stock_name) is None:
                        three_day[hot_money_name][stock_name] = {}
                        three_day[hot_money_name][stock_name]['buy_value'] = 0
                        three_day[hot_money_name][stock_name]['sell_value'] = 0
                    three_day[hot_money_name][stock_name]['buy_value'] += buy_item['buy_value']
                    if buy_item['sell_value'] is not None:
                        three_day[hot_money_name][stock_name]['sell_value'] += buy_item['sell_value']
            
            for sell_item in three_day_transactions['sell_items']:
                if len(sell_item['hot_money']) != 0:
                    hot_money = sell_item['hot_money'][0]
                    hot_money_name = hot_money['name']
                    if three_day.get(hot_money_name) is None:
                        three_day[hot_money_name] = {}

                    if three_day[hot_money_name].get(stock_name) is None:
                        three_day[hot_money_name][stock_name] = {}
                        three_day[hot_money_name][stock_name]['buy_value'] = 0
                        three_day[hot_money_name][stock_name]['sell_value'] = 0
                    three_day[hot_money_name][stock_name]['sell_value'] += sell_item['sell_value']
                    if sell_item['buy_value'] is not None:
                        three_day[hot_money_name][stock_name]['buy_value'] += sell_item['buy_value']

    one_day_net_buy = []
    one_day_net_sell = []
    for hot_money_name in one_day.keys():
        if hot_money_name == 'T王':
            continue

        tmp_buy = []
        tmp_sell = []
        for stock_name in one_day[hot_money_name].keys():
            if stock_name.startswith(("*", "ST", "退", "N", "C")):
                continue
            if one_day[hot_money_name][stock_name]['buy_value'] > one_day[hot_money_name][stock_name]['sell_value']:
                tmp_buy.append({
                    "stock_name": stock_name,
                    "value": one_day[hot_money_name][stock_name]['buy_value'] - one_day[hot_money_name][stock_name]['sell_value'],
                })
            elif one_day[hot_money_name][stock_name]['buy_value'] < one_day[hot_money_name][stock_name]['sell_value']:
                tmp_sell.append({
                    "stock_name": stock_name,
                    "value": one_day[hot_money_name][stock_name]['sell_value'] - one_day[hot_money_name][stock_name]['buy_value'],
                })
        if len(tmp_buy) != 0:
            one_day_net_buy.append({
                "name": hot_money_name,
                "transactions": tmp_buy,
            })
        if len(tmp_sell) != 0:
            one_day_net_sell.append({
                "name": hot_money_name,
                "transactions": tmp_sell,
            })

    return {"one_day_net_buy": one_day_net_buy, "one_day_net_sell": one_day_net_sell}
