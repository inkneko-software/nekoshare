"""
本文件包括从同花顺/tushare/akshare等各个数据平台获取数据，转化为nekoshare的mysql存储格式，此类接口以fetch为前缀

以及nekoshare从mysql中读取数据的统一访问接口，此类接口以get与save为前缀
"""

import json
import math
import tushare as ts

# import group_breakout.akshare as ak

import akshare as ak
from datetime import date, datetime
import mysql.connector
from mysql.connector import pooling
import time
import pandas as pd
from bs4 import BeautifulSoup
import os

from entity.THSIndustry import THSIndustry
from entity.THSIndustryDayPrice import THSIndustryDayPrice
from entity.THSIndustryStock import THSIndustryStock
from entity.StockData import StockData
from entity.THSIndustryMarket import THSIndustryMarket
from entity.StockDayPrice import StockDayPrice
from group_breakout.trade_day import get_latest_trading_day
from group_breakout.selenium import _selenium_get

import requests.exceptions
from sqlalchemy import create_engine
import pandas as pd
from mootdx.quotes import Quotes
import warnings

# 屏蔽特定类型的弃用警告
warnings.filterwarnings(
    "ignore",
    category=FutureWarning,
    message=".*Series.fillna with 'method' is deprecated.*",
)

tushare_api_key = os.environ.get("TUSHARE_KEY")
mysql_host = os.environ.get("MYSQL_HOST")
mysql_user = os.environ.get("MYSQL_USER")
mysql_passwd = os.environ.get("MYSQL_PASSWD")

engine = create_engine(
    f"mysql+pymysql://{mysql_user}:{mysql_passwd}@{mysql_host}/nekoshare"
)
ts.set_token(tushare_api_key)


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


def log(key, status_code, headers, text):
    pass
    # print("--------------------------------")
    # print(f"请求 {key} 返回状态码: {status_code} , headers: {headers} , text: {text[:200]}...")
    # print("--------------------------------")


def fetch_ths_industries() -> list[THSIndustry]:
    """
    获取同花顺所有行业列表与代码
    """
    industries = []
    for i in range(1, 3):
        res = _selenium_get(
            f"https://q.10jqka.com.cn/thshy/index/field/199112/order/desc/page/{i}/ajax/1/"
        )

        # 从html中提取表格
        soup = BeautifulSoup(res, "lxml")  # 使用lxml作为解析器
        rows = soup.select("table tbody tr")
        for row in rows:
            columns = row.select("td")
            industries.append(
                THSIndustry(
                    code=columns[1].select("a")[0]["href"].split("/")[-2],
                    name=columns[1].get_text(strip=True),
                )
            )
    return industries


def fetch_ths_industry_stocks(code: str) -> list[THSIndustryStock]:
    """
    获取同花顺行业下的成分股
    """
    res = _selenium_get(f"https://q.10jqka.com.cn/thshy/detail/code/{code}")
    soup = BeautifulSoup(res, "lxml")
    page_num = soup.find(name="span", attrs={"class": "page_info"})
    page_num = page_num.text.split("/")[1] if page_num != None else 1
    print(page_num)
    stocks = []
    for p in range(1, int(page_num) + 1):
        res = _selenium_get(
            f"https://q.10jqka.com.cn/thshy/detail/field/199112/order/desc/page/{p}/ajax/1/code/{code}"
        )
        soup = BeautifulSoup(res, "lxml")
        rows = soup.select("table tbody tr")
        for row in rows:
            columns = row.select("td")
            stocks.append(
                THSIndustryStock(
                    industry_code=code,
                    stock_code=columns[1].get_text(strip=True),
                    stock_name=columns[2].get_text(strip=True),
                )
            )
    return stocks


def _stock_board_industry_index_ths(
    symbol_code: str = "881103",
    start_date: str = "20200101",
) -> pd.DataFrame:
    """
    同花顺-板块-行业板块-指数数据
    https://q.10jqka.com.cn/thshy/detail/code/881270/
    :param start_date: 开始时间
    :type start_date: str
    :param end_date: 结束时间
    :type end_date: str
    :param symbol: 指数数据
    :type symbol: str
    :return: 指数数据
    :rtype: pandas.DataFrame
    """
    end_date = date.today().strftime("%Y%m%d")
    big_df = pd.DataFrame()
    current_year = datetime.now().year
    begin_year = int(start_date[:4])
    for year in range(begin_year, current_year + 1):
        url = f"https://d.10jqka.com.cn/v4/line/bk_{symbol_code}/01/{year}.js"

        r = _selenium_get(url, raw_js=True)
        data_text = r

        try:
            json.loads(data_text[data_text.find("{") : -1])
        except:  # noqa: E722
            continue
        temp_df = json.loads(data_text[data_text.find("{") : -1])
        temp_df = pd.DataFrame(temp_df["data"].split(";"))
        temp_df = temp_df.iloc[:, 0].str.split(",", expand=True)
        big_df = pd.concat(objs=[big_df, temp_df], ignore_index=True)

    if len(big_df.columns) == 11:
        big_df.columns = [
            "日期",
            "开盘价",
            "最高价",
            "最低价",
            "收盘价",
            "成交量",
            "成交额",
            "_",
            "_",
            "_",
            "_",
        ]
    else:
        big_df.columns = [
            "日期",
            "开盘价",
            "最高价",
            "最低价",
            "收盘价",
            "成交量",
            "成交额",
            "_",
            "_",
            "_",
            "_",
            "_",
        ]
    big_df = big_df[
        [
            "日期",
            "开盘价",
            "最高价",
            "最低价",
            "收盘价",
            "成交量",
            "成交额",
        ]
    ]
    big_df["日期"] = pd.to_datetime(big_df["日期"], errors="coerce").dt.date
    big_df.index = pd.to_datetime(big_df["日期"], errors="coerce")
    big_df = big_df[start_date:end_date]
    big_df.reset_index(drop=True, inplace=True)
    big_df["开盘价"] = pd.to_numeric(big_df["开盘价"], errors="coerce")
    big_df["最高价"] = pd.to_numeric(big_df["最高价"], errors="coerce")
    big_df["最低价"] = pd.to_numeric(big_df["最低价"], errors="coerce")
    big_df["收盘价"] = pd.to_numeric(big_df["收盘价"], errors="coerce")
    big_df["成交量"] = pd.to_numeric(big_df["成交量"], errors="coerce")
    big_df["成交额"] = pd.to_numeric(big_df["成交额"], errors="coerce")

    # 对日线数据的修正，有时当日实时数据没有更新到年度日线数据中
    # 一种情况是有当日的K线数据，但只有现价
    # 另一种情况是没有当日的K线数据
    today_r = _selenium_get(
        f"https://d.10jqka.com.cn/v4/line/bk_{symbol_code}/01/today.js", raw_js=True
    )
    today_d = json.loads(today_r[today_r.find("{") : -1])
    today_d = today_d[f"bk_{symbol_code}"]
    last_date = big_df.iloc[-1]["日期"].strftime("%Y%m%d")
    if today_d["1"] == last_date:
        big_df.loc[big_df.index[-1], "开盘价"] = pd.to_numeric(
            today_d["7"], errors="coerce"
        )
        big_df.loc[big_df.index[-1], "最高价"] = pd.to_numeric(
            today_d["8"], errors="coerce"
        )
        big_df.loc[big_df.index[-1], "最低价"] = pd.to_numeric(
            today_d["9"], errors="coerce"
        )
        big_df.loc[big_df.index[-1], "收盘价"] = pd.to_numeric(
            today_d["11"], errors="coerce"
        )
        big_df.loc[big_df.index[-1], "成交量"] = pd.to_numeric(
            today_d["13"], errors="coerce"
        )
        big_df.loc[big_df.index[-1], "成交额"] = pd.to_numeric(
            today_d["19"], errors="coerce"
        )
    else:
        big_df.loc[len(big_df)] = [
            pd.to_datetime(today_d["1"], format="%Y%m%d").date(),
            pd.to_numeric(today_d["7"], errors="coerce"),
            pd.to_numeric(today_d["8"], errors="coerce"),
            pd.to_numeric(today_d["9"], errors="coerce"),
            pd.to_numeric(today_d["11"], errors="coerce"),
            pd.to_numeric(today_d["13"], errors="coerce"),
            pd.to_numeric(today_d["19"], errors="coerce"),
        ]

    return big_df


def fetch_ths_industry_day_price(industry: THSIndustry) -> list[THSIndustryDayPrice]:
    """
    获取同花顺行业所有日线数据
    """
    d = []
    i = 0
    ret_day = _stock_board_industry_index_ths(
        symbol_code=industry.code,
        start_date="20250101",
    )
    for data in ret_day.itertuples():
        day_price = THSIndustryDayPrice(
            # date=data.日期.strftime("%Y%m%d"),
            # open=data.开盘价,
            # high=data.最高价,
            # low=data.最低价,
            # close=data.收盘价,
            # volume=data.成交量,
            # prev_close=None if i == 0 else d[i - 1].close
            industry_code=industry.code,
            industry_name=industry.name,
            trade_date=data.日期.strftime("%Y%m%d"),
            open=data.开盘价,
            close=data.收盘价,
            high=data.最高价,
            low=data.最低价,
            pre_close=data.开盘价 if i == 0 else d[i - 1].close,
            volume=data.成交量,
            created_at=None,
        )
        i += 1
        d.append(day_price)

    return d


def fetch_rk_and_save():
    """
    获取当前股票实时日线
    有个问题是，东方财富会以IP级别进行反爬，如果提示报错，请登录网站过下验证码
    """
    try:
        pool = MySQLConnectionPool()
        # https://tushare.pro/document/2?doc_id=372 沪深京实时日线
        data = ak.stock_zh_a_spot_em()
        data = data.rename(columns={"市盈率-动态": "pe_dynamic"})
        print(f"{time.strftime('%Y-%m-%d %H:%M')} 已拉取实时日线数据, 共{len(data)}条")

        """
                        序号      代码      名称     最新价    涨跌幅    涨跌额       成交量         
                            成交额     振幅      最高     最低     今开     昨收    量比    换手率  市盈率-动态   市净率   
                                            总市值          流通市值   涨速  5分钟涨跌  60日涨跌幅  年初至今涨跌幅

        """
        for data in data.itertuples(index=False):

            if math.isnan(data.今开):
                continue
            if math.isnan(data.量比):
                continue
            if math.isnan(data.pe_dynamic):
                continue

            sql = """
            INSERT INTO stock_data (stock_code, stock_name, price, open, high, low, percent_change, pre_close, quantity_ratio, float_share, float_cap, pe_ratio)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
            stock_name = VALUES(stock_name),
            price = VALUES(price),
            open = VALUES(open),
            high = VALUES(high),
            low = VALUES(low),
            percent_change = VALUES(percent_change),
            pre_close = VALUES(pre_close),
            quantity_ratio = VALUES(quantity_ratio),
            float_share = VALUES(float_share),
            float_cap = VALUES(float_cap),
            pe_ratio = VALUES(pe_ratio)
            """
            vals = (
                data.代码,
                data.名称,
                data.最新价,
                data.今开,
                data.最高,
                data.最低,
                data.涨跌幅,
                data.昨收,
                data.量比,
                0,
                data.流通市值 / 100000000,
                data.pe_dynamic,
            )
            print(vals)
            pool.query(sql, vals)

            sql = """
                    INSERT INTO stock_day_price (stock_code, stock_name, trade_date, open, close, high, low, pre_close, volume, amount, percent_change, close_at_limit_high)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                    stock_name = VALUES(stock_name),
                    open = VALUES(open),
                    close = VALUES(close),
                    high= VALUES(high),
                    low = VALUES(low),
                    pre_close = VALUES(pre_close),
                    volume = VALUES(volume),
                    amount = VALUES(amount),
                    percent_change = VALUES(percent_change),
                    close_at_limit_high = VALUES(close_at_limit_high)
                    """
            vals = (
                data.代码,
                data.名称,
                str(date.today()),
                data.今开,
                data.最新价,
                data.最高,
                data.最低,
                data.昨收,
                data.成交量 * 100,
                data.成交额,
                data.涨跌幅,
                data.最新价 == round(data.昨收 * 1.1, 2),
            )
            print(vals)
            pool.query(sql, vals)
        print(f"{time.strftime('%Y-%m-%d %H:%M')} 数据已存入数据库")
    except KeyboardInterrupt:
        print("进程由用户终止")


def fetch_all_qfq_and_save():
    """
    获取当前市场所有股票的复权因子
    由于接口频率有限，预计需要十几分钟才能拉取完成
    """
    sql = """
        INSERT INTO stock_day_qfq(stock_code, trade_date, adj_factor)
        VALUES(%s, %s, %s)
        ON DUPLICATE KEY UPDATE
        adj_factor = VALUES(adj_factor)
    """

    def fetch_adj_factor_with_retry(ts_code, max_retry=5, wait_seconds=60):
        """
        获取单只股票复权因子，网络异常重试
        """
        attempt = 0
        while attempt < max_retry:
            try:
                df = pro.adj_factor(ts_code=ts_code, trade_date="")
                return df
            except OSError as e:
                attempt += 1
                print(
                    f"[{ts_code}] 频率超限，重试 {attempt}/{max_retry}，等待 {wait_seconds} 秒..."
                )
                time.sleep(wait_seconds)
            except Exception as e:
                # 捕获 Tushare 其他异常
                attempt += 1
                print(
                    f"[{ts_code}] 调用失败：{e}，重试 {attempt}/{max_retry}，等待 {wait_seconds} 秒..."
                )
                time.sleep(wait_seconds)
        raise OSError(f"[{ts_code}] 超过最大重试次数")

    pool = MySQLConnectionPool()
    pro = ts.pro_api()
    data = pro.stock_basic(
        exchange="",
        list_status="L",
        fields="ts_code,symbol,name,area,industry,list_date",
    )
    i = 0
    n = data.__len__()
    for stock in data.itertuples():
        print(f"\r{i}/{n}")
        i += 1
        ts_code = stock.ts_code
        df = fetch_adj_factor_with_retry(ts_code=ts_code)
        df.dropna(subset=["trade_date"], inplace=True)
        records = [
            (stock.symbol, row.trade_date, row.adj_factor) for row in df.itertuples()
        ]
        pool.queryMany(sql, records)


def fetch_today_qfq_and_save():
    """
    获取当日所有的复权因子，用于每日更新
    """
    sql = """
        INSERT INTO stock_day_qfq(stock_code, trade_date, adj_factor)
        VALUES(%s, %s, %s)
        ON DUPLICATE KEY UPDATE
        adj_factor = VALUES(adj_factor)
    """
    pool = MySQLConnectionPool()
    pro = ts.pro_api()
    df = pro.adj_factor(
        ts_code="", trade_date=get_latest_trading_day().strftime("%Y%m%d")
    )
    print(df)
    records = [
        (row.ts_code.split(".")[0], row.trade_date, row.adj_factor)
        for row in df.itertuples()
    ]
    pool.queryMany(sql, records)


def fetch_and_save(marketOnly=False):
    conn = mysql.connector.connect(
        host="10.200.0.20",
        user="root",
        password="test",
        database="nekoshare",
    )
    cursor = conn.cursor()
    # sql语句参考data/sql/nekoshare.sql 中的表结构设计

    # 获取行业信息
    industries = fetch_ths_industries()

    for industry in industries:
        print(f"正在处理行业 {industry.code} - {industry.name} ...")
        # 保存行业信息
        sql = """
        INSERT INTO ths_industry (code, name)
        VALUES (%s, %s)
        ON DUPLICATE KEY UPDATE
        name = VALUES(name)
        """
        vals = (industry.code, industry.name)
        cursor.execute(sql, vals)
        conn.commit()

        print(f"  获取并保存行业日线数据...")
        # 获取行业日线数据
        prices = fetch_ths_industry_day_price(industry)
        # 保存行业日线数据
        sql = """
        INSERT INTO ths_industry_day_price (industry_code, industry_name, trade_date, open, close, high, low, pre_close, volume)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
        industry_name = VALUES(industry_name),
        open = VALUES(open),
        close = VALUES(close),
        high = VALUES(high),
        low = VALUES(low),
        pre_close = VALUES(pre_close),
        volume = VALUES(volume)
        """
        records = [
            (
                industry.code,
                industry.name,
                price.trade_date,
                price.open,
                price.close,
                price.high,
                price.low,
                price.pre_close,
                price.volume,
            )
            for price in prices
        ]
        print(records)
        cursor.executemany(sql, records)
        conn.commit()

        # 如果只更新市场行情，则跳过成分股获取与保存
        if marketOnly:
            continue

        print(f"  获取并保存行业成分股...")
        # 获取行业成分股
        stocks = fetch_ths_industry_stocks(industry.code)
        # 保存行业成分股
        sql = """
        INSERT INTO ths_industry_stock (industry_code, stock_code, stock_name)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE
        stock_name = VALUES(stock_name)
        """
        records = [
            (stock.industry_code, stock.stock_code, stock.stock_name)
            for stock in stocks
        ]
        cursor.executemany(sql, records)
        conn.commit()
        time.sleep(5)
    print("数据获取完成")


def get_ths_industry() -> list[THSIndustry]:
    pool = MySQLConnectionPool()
    sql = "SELECT code, name FROM ths_industry"
    results = pool.query(sql)
    industries = [THSIndustry(code=row[0], name=row[1]) for row in results]
    return industries


def get_ths_industry_market() -> list[THSIndustryMarket]:
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
    code: str, start_date="19190810", end_date="20990101"
) -> list[THSIndustryDayPrice]:
    pool = MySQLConnectionPool()
    sql = """
    SELECT industry_code, industry_name, trade_date, open, close, high, low, pre_close, volume, created_at
    FROM ths_industry_day_price
    WHERE industry_code = %s AND trade_date BETWEEN %s AND %s
    ORDER BY trade_date ASC
    """
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
        df_merged = pd.merge(
            df_k, df_factor, on=["stock_code", "trade_date"], how="inner"
        )
        base_factor = df_factor.adj_factor.iloc[-1]
        for col in ["open", "high", "low", "close", "pre_close"]:
            df_merged[col] = df_merged[col] * df_merged["adj_factor"] / base_factor

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

    # ts_code = (
    #     code + ".SZ"
    #     if code.startswith("0") or code.startswith("3")
    #     else (code + ".SH" if code.startswith("6") else code + ".BJ")
    # )
    # df = ts.pro_bar(
    #     ts_code=ts_code,
    #     adj="qfq",
    #     start_date=start_date,
    #     end_date=end_date,
    #     freq="D",
    #     asset="E",
    # )
    # df = df.sort_values(by="trade_date", ascending=True).reset_index(drop=True)
    # candlesticks = [
    #     StockDayPrice(
    #         trade_date=datetime.strptime(row.trade_date, "%Y%m%d").date(),
    #         open=row.open,
    #         high=row.high,
    #         low=row.low,
    #         close=row.close,
    #         volume=row.vol,
    #         amount=row.amount,
    #         close_at_limit_high=row.close == round(row.pre_close * 1.1, 2),
    #         pre_close=row.pre_close,
    #         stock_code=code,
    #         stock_name="",
    #         percent_change=row.pct_chg,
    #         created_at=None,
    #     )
    #     for row in df.itertuples()
    # ]
    # return candlesticks


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

def fetch_rk_from_tdx_and_save():
    """
    从通达信获取实时日K数据
    """
    print(f"{time.strftime('%Y-%m-%d %H:%M')} 开始从通达信获取实时日K数据")
    pool = MySQLConnectionPool()
    client = Quotes.factory(market="std", multithread=True)
    sql = """
    SELECT stock_code, stock_name
    FROM stock_data
    """
    rows = pool.query(sql)
    i = 0
    stocks = {}
    for row in rows:
        code = row[0]
        name = row[1]
        if code.startswith(("6", "0", "3")):
            stocks[code]=name
        
    for i in range(0, len(stocks.keys()), 50):
        datas = client.quotes(symbol=list(stocks.keys())[i:i+50])
        for data in datas.itertuples():
            if  data.last_close == 0:
                # print(f"{time.strftime('%Y-%m-%d %H:%M')} {code} {name} {data} 数据获取不完整")
                i += 1
                continue
            code = data.code
            name = stocks[code]
            sql = """
                        INSERT INTO stock_day_price (stock_code, stock_name, trade_date, open, close, high, low, pre_close, volume, amount, percent_change, close_at_limit_high)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                        stock_name = VALUES(stock_name),
                        open = VALUES(open),
                        close = VALUES(close),
                        high= VALUES(high),
                        low = VALUES(low),
                        pre_close = VALUES(pre_close),
                        volume = VALUES(volume),
                        amount = VALUES(amount),
                        percent_change = VALUES(percent_change),
                        close_at_limit_high = VALUES(close_at_limit_high)
                        """
            vals = (
                code,
                name,
                str(date.today()),
                float(data.open),
                float(data.price),
                float(data.high),
                float(data.low),
                float(data.last_close),
                float(data.vol * 100),
                float(data.amount),
                float(round((data.price - data.last_close) /  data.last_close * 100, 2)),
                bool(data.price == round(data.last_close * 1.1, 2))
            )
            pool.query(sql, vals)

            sql = """
                UPDATE stock_data
                SET price = %s,
                    open = %s,
                    high = %s,
                    low = %s,
                    percent_change = %s,
                    pre_close = %s
                WHERE stock_code = %s
            """
            vals = (
                float(data.price),
                float(data.open),
                float(data.high),
                float(data.low),
                float(round((data.price - data.last_close) /  data.last_close * 100, 2)),
                float(data.last_close),
                code,
            )
            pool.query(sql, vals)
            i += 1
            print(f"{time.strftime('%Y-%m-%d %H:%M')} {code} {name} {i}/{len(stocks.keys())}")
    print(f"{time.strftime('%Y-%m-%d %H:%M')} 数据已存入数据库")
        


def loop():
    today_first_run = True
    while True:
        # 每个交易日的9点30后可以开始获取，注意频率以及反爬
        if (
            get_latest_trading_day() == datetime.now().date()
            and (
                datetime.now().hour > 9
                or (datetime.now().hour == 9 and datetime.now().minute >= 30)
            )
            and (datetime.now().hour < 16)
        ):
            if today_first_run:
                today_first_run = False
                fetch_today_qfq_and_save()
                try:
                    fetch_rk_and_save()
                except requests.exceptions.ConnectionError:
                    print(f"{time.strftime('%Y-%m-%d %H:%M')} 获取东方财富实时数据失败")

            fetch_rk_from_tdx_and_save()
            fetch_and_save(marketOnly=True)
        else:
            today_first_run = True

        time.sleep(60 * 5)
        


if __name__ == "__main__":
    loop()
    # fetch_all_qfq_and_save()
    # loop()
    # print(get_stock_day_price("600268", "20140101"))
    # 标准市场
    # client = Quotes.factory(market="std", multithread=True, heartbeat=True)
    # # k 线数据
    # client.bars(symbol="600036", frequency=9, offset=10)

    # client.quotes(symbol=["000001", "600300"])
    # fetch_rk_from_tdx_and_save()
