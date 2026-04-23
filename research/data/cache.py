import threading
import redis
import os
from utils.log import LoggerFactory

import json

from datetime import date, datetime
from mysql.connector import pooling
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


log = LoggerFactory.get_logger(__name__)

mysql_host = os.environ.get("DB_HOST")
mysql_user = os.environ.get("DB_USER")
mysql_passwd = os.environ.get("DB_PASSWORD")
redis_host = os.environ.get("REDIS_HOST")
redis_port = os.environ.get("REDIS_PORT")
engine = create_engine(
    f"mysql+pymysql://{mysql_user}:{mysql_passwd}@{mysql_host}/nekoshare",
    pool_pre_ping=True,
    pool_recycle=3600
)


# 股票历史日K线数据缓存
stock_day_price_qfq = {}
stock_day_price_qfq_lock = threading.Lock()


class RedisSubscriber:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):

        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
        return cls._instance

    def start(self):
        t = threading.Thread(target=self.listen, daemon=True)
        t.start()

    def listen(self):
        r = redis.Redis(decode_responses=True, host=redis_host, port=int(redis_port))
        pubsub = r.pubsub()
        pubsub.subscribe("nekoshare_cache_evict")

        for msg in pubsub.listen():
            if msg["type"] == "message":
                msg_data = msg["data"]
                log.info("收到缓存失效消息: %s", msg_data)
                if msg_data == "stock_day_price_qfq":
                    with stock_day_price_qfq_lock:
                        stock_day_price_qfq.clear()
                    log.info("已清空股票历史日K线数据缓存")
                elif msg_data == "stock_current_price":
                    self.update_stock_day_price_qfq()
                    log.info("已更新当日行情数据缓存")
    
    def update_stock_day_price_qfq(self):
        trade_date = trade_day.get_latest_trading_day()
        with stock_day_price_qfq_lock:
            sql = """
                SELECT stock_code, stock_name, trade_date, open, close, high, low, pre_close, percent_change, volume, amount,created_at FROM stock_day_price
                WHERE trade_date = %s
                """
            param = (trade_date,)
            df_k = pd.read_sql(sql, engine, params=param)
            # 如果请求的日期数据不存在，则不替换当日行情数据
            if len(df_k) != 0:
                for stock_code, df_group in df_k.groupby("stock_code"):
                    df_group = df_group.set_index("trade_date")
                    if stock_code not in stock_day_price_qfq:
                        stock_day_price_qfq[stock_code] = df_group
                    else:
                        df_old = stock_day_price_qfq[stock_code]
                        df_old.loc[pd.to_datetime(trade_date)] = df_group.iloc[0]



RedisSubscriber().start()