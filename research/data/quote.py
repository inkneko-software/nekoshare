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

import data.cache as cache

from utils.log import LoggerFactory

log = LoggerFactory.get_logger(__name__)

# # 屏蔽特定类型的弃用警告
# warnings.filterwarnings(
#     "ignore",
#     category=FutureWarning,
#     message=".*Series.fillna with 'method' is deprecated.*",
# )

mysql_host = os.environ.get("DB_HOST")
mysql_user = os.environ.get("DB_USER")
mysql_passwd = os.environ.get("DB_PASSWORD")

engine = create_engine(
    f"mysql+pymysql://{mysql_user}:{mysql_passwd}@{mysql_host}/nekoshare",
    pool_pre_ping=True,
    pool_recycle=3600
)


class MySQLConnectionPool:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MySQLConnectionPool, cls).__new__(cls)
            cls._instance.__init_connection()
        return cls._instance

    def __init_connection(self):
        pool = pooling.MySQLConnectionPool(
            host=mysql_host,
            user=mysql_user,
            password=mysql_passwd,
            database="nekoshare",
            pool_name="nekoshare_pool",
            pool_size=5,
        )
        self.pool = pool

    def query(self, sql: str, vals: tuple = ()):
        conn = self.pool.get_connection()
        cursor = conn.cursor()
        cursor.execute(sql, vals)
        results = cursor.fetchall()
        conn.commit()
        cursor.close()
        conn.close()
        return results

    def queryMany(self, sql: str, vals_list: list[tuple]):
        conn = self.pool.get_connection()
        cursor = conn.cursor()
        cursor.executemany(sql, vals_list)
        results = cursor.fetchall()
        conn.commit()
        cursor.close()
        conn.close()
        return results

    def conn(self):
        return self.pool.get_connection()

def get_ths_industry() -> list[THSIndustry]:
    pool = MySQLConnectionPool()
    sql = "SELECT code, name FROM ths_industry"
    results = pool.query(sql)
    industries = [THSIndustry(code=row[0], name=row[1]) for row in results]
    return industries


def get_ths_industry_market() -> list[THSIndustryMarket]:
    """
    获取同花顺所有行业板块最新行情

    return list[THSIndustryMarket]
    """
    pool = MySQLConnectionPool()
    industry_market = []
    sql = "SELECT code, name FROM ths_industry"
    results = pool.query(sql)
    for row in results:
        sql2 = "SELECT close, pre_close FROM ths_industry_day_price WHERE industry_code = %s ORDER BY trade_date DESC LIMIT 1"
        vals = (row[0],)
        result2 = pool.query(sql2, vals)
        if len(result2) != 1:
            continue
        result2 = result2[0]
        industry_market.append(
            THSIndustryMarket(
                row[0], row[1], (round((result2[0] - result2[1]) / result2[1] * 100, 2))
            )
        )
    industry_market.sort(key=lambda x: x.change_pct, reverse=True)
    return industry_market


def get_ths_industry_day_price(
    code: str, start_date="19190810", end_date="20990101", latest=False
) -> list[THSIndustryDayPrice]:
    """
    获取同花顺行业日线数据
    :param code: 行业代码
    :param start_date: 起始日期，格式为 'YYYYMMDD'
    :param end_date: 结束日期，格式为 'YYYYMMDD'
    :param latest: 是否只返回最新数据
    """
    pool = MySQLConnectionPool()
    sql = """
    SELECT industry_code, industry_name, trade_date, open, close, high, low, pre_close, volume, created_at
    FROM ths_industry_day_price
    WHERE industry_code = %s AND trade_date BETWEEN %s AND %s
    """
    if latest:
        sql += "ORDER BY trade_date DESC LIMIT 1"
    else:
        sql += "ORDER BY trade_date ASC"

    vals = (code, start_date, end_date)
    results = pool.query(sql, vals)
    day_prices = [
        THSIndustryDayPrice(
            industry_code=row[0],
            industry_name=row[1],
            trade_date=row[2],
            open=row[3],
            close=row[4],
            high=row[5],
            low=row[6],
            pre_close=row[7],
            volume=row[8],
            created_at=row[9],
        )
        for row in results
    ]
    return day_prices


def get_ths_industry_stocks(code: str) -> list[THSIndustryStock]:
    pool = MySQLConnectionPool()
    sql = """
    SELECT industry_code, stock_code, stock_name
    FROM ths_industry_stock
    WHERE industry_code = %s
    """
    vals = (code,)
    results = pool.query(sql, vals)
    stocks = [
        THSIndustryStock(
            industry_code=row[0],
            stock_code=row[1],
            stock_name=row[2],
        )
        for row in results
    ]
    return stocks

def get_stock_day_price_qfq_cached(code: str, start_date=None, end_date=None) -> pd.DataFrame:
    def load_from_db():
        start_year = start_date[:4]
        end_year = end_date[:4]
        df = get_stock_day_price_df(
            code=code,
            start_date=start_year + "0101",
            end_date=end_year + "1231",
        )
        df["trade_date"] = pd.to_datetime(df["trade_date"])
        df.set_index("trade_date", inplace=True)
        df.sort_index(inplace=True)
        df.index.name = "trade_date"
        return df

    with cache.stock_day_price_qfq_lock:
        if code in cache.stock_day_price_qfq:
            df = cache.stock_day_price_qfq[code]
            df_start = df.index.min()
            df_end = df.index.max()
            is_cover = df_start <= pd.Timestamp(start_date) and df_end >= pd.Timestamp(end_date)
            if is_cover:
                ret_day = df.loc[start_date:end_date].copy()
            else:
                df = load_from_db()
                cache.stock_day_price_qfq[code] = df
                ret_day = df.loc[start_date:end_date].copy()
        else:
            df = load_from_db()
            cache.stock_day_price_qfq[code] = df
            ret_day = df.loc[start_date:end_date].copy()
        

        # # 如果请求的end_date是最新一日，则从相应缓存中获取最新数据
        # if datetime.strptime(end_date, "%Y%m%d").date() == trade_day.get_latest_trading_day() :
        #     with cache.stock_current_price_lock:
        #         current_price = cache.stock_current_price.get(code)
        #         if current_price is not None:
        #             print(f"最新行情缓存命中: {current_price}")
        #             ret_day.loc[pd.to_datetime(end_date)] = pd.Series(current_price)
        #         elif len(cache.stock_current_price) != 0:
        #             # 如果无该票的缓存，但是缓存不为空，说明该票没有当日数据
        #             pass
        #         else:
        #             sql = """
        #                 SELECT stock_code, stock_name, trade_date, open, close, high, low, pre_close, percent_change, volume, amount,created_at FROM stock_day_price
        #                 WHERE trade_date = %s
        #                 """
        #             param = (end_date,)
        #             df_k = pd.read_sql(sql, engine, params=param)
        #             # 如果请求的日期数据不存在，则不替换当日行情数据
        #             if len(df_k) != 0:
        #                 cache.stock_current_price = {
        #                     row['stock_code']: row.to_dict()
        #                     for _, row in df_k.iterrows()
        #                 }
        #                 print(f"最新行情缓存更新: {cache.stock_current_price}")
        #                 ret_day.loc[pd.to_datetime(end_date)] = pd.Series(cache.stock_current_price[code])
        
        return ret_day

def get_stock_day_price_df(
    code: str, start_date=None, end_date=None, fq="qfq"
) -> pd.DataFrame:
    pool = MySQLConnectionPool()
    sql = """
        SELECT stock_code, stock_name, trade_date, open, close, high, low, pre_close, percent_change, volume, amount,created_at FROM stock_day_price
        WHERE stock_code = %s
        """
    param = None
    date_sql = ""
    if start_date != None and end_date != None:
        date_sql = " AND trade_date BETWEEN %s AND %s"
        param = (code, start_date, end_date)
    elif start_date != None:
        date_sql = " AND trade_date >= %s"
        param = (code, start_date)
    elif end_date != None:
        date_sql = " AND trade_date <= %s"
        param = (code, end_date)
    else:
        param = (code,)

    df_k = pd.read_sql(sql + date_sql, engine, params=param)
    if len(df_k) == 0:
        return []

    if fq == "qfq":
        sql = """
        SELECT stock_code, trade_date, adj_factor FROM stock_day_qfq
        WHERE stock_code = %s
        """
        df_factor = pd.read_sql(sql + date_sql, engine, params=param)
        df_merged = df_k
        if len(df_factor) != 0:
            df_merged = pd.merge(
                df_k, df_factor, on=["stock_code", "trade_date"], how="inner"
            )
        
        for col in ["open", "high", "low", "close", "pre_close"]:
            df_merged[col] = df_merged[col] * df_merged["adj_factor"] 

        return df_merged

    return df_k

def get_stock_data(code: str) -> StockData:
    pool = MySQLConnectionPool()
    sql = """
    SELECT stock_code, stock_name, price, `open`, high, low, percent_change, pre_close,
           quantity_ratio, float_share, float_cap, pe_ratio, industry, area
    FROM stock_data
    WHERE stock_code = %s
    """
    vals = (code,)
    results = pool.query(sql, vals)
    if len(results) == 0:
        return None

    result = results[0]
    stock_data = StockData(
        stock_code=result[0],
        stock_name=result[1],
        price=float(result[2]),
        open=float(result[3]),
        high=float(result[4]),
        low=float(result[5]),
        percent_change=float(result[6]),
        pre_close=float(result[7]),
        quantity_ratio=float(result[8]),
        float_share=float(result[9]),
        float_cap=float(result[10]),
        pe_ratio=float(result[11]),
        industry=result[12],
        area=result[13],
    )
    return stock_data

def get_stock_day_price(
    code: str, start_date=None, end_date=None, fq="qfq"
) -> list[StockDayPrice]:
    pool = MySQLConnectionPool()
    sql = """
        SELECT stock_code, stock_name, trade_date, open, close, high, low, pre_close, percent_change, volume, amount,created_at FROM stock_day_price
        WHERE stock_code = %s
        """
    param = None
    date_sql = ""
    if start_date != None and end_date != None:
        date_sql = " AND trade_date BETWEEN %s AND %s"
        param = (code, start_date, end_date)
    elif start_date != None:
        date_sql = " AND trade_date >= %s"
        param = (code, start_date)
    elif end_date != None:
        date_sql = " AND trade_date <= %s"
        param = (code, end_date)
    else:
        param = (code,)

    df_k = pd.read_sql(sql + date_sql, engine, params=param)
    if len(df_k) == 0:
        return []

    if fq == "qfq":
        sql = """
        SELECT stock_code, trade_date, adj_factor FROM stock_day_qfq
        WHERE stock_code = %s
        """
        df_factor = pd.read_sql(sql + date_sql, engine, params=param)
        df_merged = df_k
        if len(df_factor) != 0:
            df_merged = pd.merge(
                df_k, df_factor, on=["stock_code", "trade_date"], how="inner"
            )
        
        for col in ["open", "high", "low", "close", "pre_close"]:
            df_merged[col] = df_merged[col] * df_merged["adj_factor"] 

        return [
            StockDayPrice(
                stock_code=row.stock_code,
                stock_name=row.stock_name,
                trade_date=row.trade_date,
                open=row.open,
                high=row.high,
                low=row.low,
                close=row.close,
                volume=row.volume,
                amount=row.amount,
                percent_change=row.percent_change,
                close_at_limit_high=row.close == round(row.pre_close * 1.1, 2),
                pre_close=row.pre_close,
                created_at=row.created_at,
            )
            for row in df_merged.itertuples()
        ]

    return [
        StockDayPrice(
            stock_code=row.stock_code,
            stock_name=row.stock_name,
            trade_date=row.trade_date,
            open=row.open,
            high=row.high,
            low=row.low,
            close=row.close,
            volume=row.volume,
            amount=row.amount,
            percent_change=row.percent_change,
            close_at_limit_high=row.close == round(row.pre_close * 1.1, 2),
            pre_close=row.pre_close,
            created_at=row.created_at,
        )
        for row in df_k.itertuples()
    ]