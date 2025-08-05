import struct
import pandas as pd
from pathlib import Path
import matplotlib.pyplot as plt
from datetime import datetime, timedelta, date
import time
import mysql.connector
import sys

day_range = 270


def read_day_file(filepath):
    """
    读取股票日线数据，并返回一个包含日期、开盘价、最高价、最低价、收盘价、成交金额和成交量的DataFrame
    """
    with open(filepath, "rb") as f:
        content = f.read()
    # 每条记录为32字节
    record_size = 32
    num_records = len(content) // record_size

    data = []
    tmp = 0
    start = 0 if num_records - day_range < 0 else num_records - day_range
    for i in range(start, num_records):
        record = struct.unpack(
            "IIIIIfII", content[i * record_size : (i + 1) * record_size]
        )
        date = str(record[0])
        date = f"{date[:4]}-{date[4:6]}-{date[6:]}"
        open_price = record[1] / 100
        high_price = record[2] / 100
        low_price = record[3] / 100
        close_price = record[4] / 100
        last_close_price = tmp if tmp != 0 else close_price
        tmp = close_price
        amount = record[5]
        volume = record[6]
        percent = round((close_price - last_close_price) / last_close_price * 100, 2)
        limit_high = round(last_close_price * 1.1, 2)
        close_at_limit_high = close_price == limit_high
        reached_limit_high_but_fall = (
            high_price == limit_high and close_price < limit_high
        )
        data.append(
            [
                date,
                open_price,
                high_price,
                low_price,
                close_price,
                last_close_price,
                amount,
                volume,
                percent,
                limit_high,
                close_at_limit_high,
                reached_limit_high_but_fall,
            ]
        )

    df = pd.DataFrame(
        data,
        columns=[
            "date",
            "open",
            "high",
            "low",
            "close",
            "last_close",
            "amount",
            "volume",
            "percent",
            "limit_high",
            "close_at_limit_high",
            "reached_limit_high_but_fall",
        ],
    )
    df["date"] = pd.to_datetime(df["date"]).dt.date

    return df


def read_sh_main():
    """
    读取上证主板日线数据

    返回字典,key=证券代码,value=pd.DataFrame，DataFrame定义见read_day_file()
    """

    sh_dir = "hsjday/sh/lday"
    folder = Path(sh_dir)
    files = [
        f.name
        for f in folder.iterdir()
        if f.is_file()
        and (
            f.name.startswith("sh600")
            or f.name.startswith("sh601")
            or f.name.startswith("sh603")
            or f.name.startswith("sh605")
        )
    ]

    data = {}
    today = pd.Timestamp.today()
    start_date = today - pd.Timedelta(days=day_range)
    for file in files:
        stock_history = read_day_file(sh_dir + "/" + file)
        # recent_data = stock_history[(stock_history["date"] >= start_date.date())]
        # 忽略掉最近90天没有数据的股票
        if (
            stock_history["date"].iloc[-1]
            < (datetime.now() - timedelta(days=90)).date()
        ):
            continue
        data[file.lstrip('sh').rstrip('.day')] = stock_history
    return data


def read_sh_main_code(code):
    """
    读取上证主板某个证券的日线数据

    返回pd.DataFrame，DataFrame定义见read_day_file()
    """
    sh_dir = "hsjday/sh/lday"
    folder = Path(sh_dir)
    data = {}
    today = pd.Timestamp.today()
    start_date = today - pd.Timedelta(days=day_range)
    stock_history = read_day_file(sh_dir + "/" + code)
    # recent_data = stock_history[(stock_history["date"] >= start_date.date())]
    return stock_history


def read_sz_main():
    """
    读取深证主板日线数据

    返回字典,key=证券代码,value=pd.DataFrame，DataFrame定义见read_day_file()
    """
    sh_dir = "hsjday/sz/lday"
    folder = Path(sh_dir)
    files = [
        f.name
        for f in folder.iterdir()
        if f.is_file()
        and (f.name.startswith("sz000") or f.name.startswith("sz001"))
        or f.name.startswith("sz002")
    ]
    data = {}
    today = pd.Timestamp.today()
    start_date = today - pd.Timedelta(days=day_range)
    for file in files:
        stock_history = read_day_file(sh_dir + "/" + file)
        # recent_data = stock_history[(stock_history["date"] >= start_date.date())]
        # 忽略掉最近90天没有数据的股票
        if (
            stock_history["date"].iloc[-1]
            < (datetime.now() - timedelta(days=90)).date()
        ):
            continue
        data[file.lstrip('sz').rstrip('.day')] = stock_history
    return data


def read_sz_main_code(code):
    """
    读取深证主板某个证券的日线数据

    返回pd.DataFrame，DataFrame定义见read_day_file()
    """
    sh_dir = "hsjday/sz/lday"
    folder = Path(sh_dir)

    data = {}
    today = pd.Timestamp.today()
    start_date = today - pd.Timedelta(days=day_range)
    stock_history = read_day_file(sh_dir + "/" + code)
    # recent_data = stock_history[(stock_history["date"] >= start_date.date())]
    return stock_history


def read_stock_info_csv():
    """
    读取通达信导出的股票基本信息

    导出方法为：左上角行情-左下角A股-键盘精灵34-格式文本文件-所有数据（显示的栏目）-导出
    retns:    pd.DataFrame，包含股票代码、股票名称等信息，见DataFrame定义
    """
    with open("./export.txt", "r", encoding="GBK") as f:
        
        chart = f.readlines()[:-1]
        header = chart[0].strip().split("\t")

        code_i = header.index("代码")
        name_i = header.index("名称")
        price_i = header.index("现价")
        open_i = header.index("今开")
        high_i = header.index("最高")
        low_i = header.index("最低")
        percent_change_i = header.index("涨幅%")
        pre_close_i = header.index("昨收")
        quantity_ratio = header.index("量比")
        float_share_i = header.index("流通股(亿)")
        float_cap_i = header.index("流通市值")
        pe_ratio_i = header.index("市盈(动)")
        industry_i = header.index("细分行业")
        area_i = header.index("地区")

        if code_i == -1 or name_i == -1 or price_i == -1 or open_i == -1 or high_i == -1 or low_i == -1 or percent_change_i == -1 or pre_close_i == -1 or float_share_i == -1 or float_cap_i == -1 or pe_ratio_i == -1 or industry_i == -1 or area_i == -1:
            raise ValueError("导出文件格式不正确，请检查导出设置。")

        data = chart[1:]
        for i in range(len(data)):
            tmp = data[i].strip().split("\t")
            #亏损公司
            if tmp[pe_ratio_i].strip() == '--':
                tmp[pe_ratio_i] = -1
            #未上市公司
            if (tmp[float_cap_i].strip() == '--'):
                tmp[float_cap_i] = '0'
                tmp[float_share_i] = '0'
            if (tmp[open_i].strip() == '--'):
                tmp[open_i] = '0'
            if (tmp[high_i].strip() == '--'):
                tmp[high_i] = '0'
            if (tmp[low_i].strip() == '--'):
                tmp[low_i] = '0'
            if (tmp[percent_change_i].strip() == '--'):
                tmp[percent_change_i] = '0'
            if (tmp[pre_close_i].strip() == '--'):
                tmp[pre_close_i] = '0'
            if (tmp[quantity_ratio].strip() == '--'):
                tmp[quantity_ratio] = '0'


            data[i] = [
                tmp[code_i].strip(),
                tmp[name_i].strip(),
                float(tmp[price_i].strip()),
                float(tmp[open_i].strip()),
                float(tmp[high_i].strip()),
                float(tmp[low_i].strip()),
                float(tmp[percent_change_i].strip().strip("%")),
                float(tmp[pre_close_i].strip()),
                float(tmp[quantity_ratio].strip()),
                float(tmp[float_share_i].strip()),
                float(tmp[float_cap_i].strip().strip("亿")),
                float(tmp[pe_ratio_i]),
                tmp[industry_i].strip(),
                tmp[area_i].strip()
            ]

        return pd.DataFrame(
            data,
            columns=[
                "stock_code",
                "stock_name",
                "price",
                "open",
                "high",
                "low",
                "percent_change",
                "pre_close",
                "quantity_ratio",
                "float_share",
                "float_cap",
                "pe_ratio",
                "industry",
                "area"
            ],
        )


def load_stock_info_to_mysql():
    """
    读取股票基本信息，并保存至MySQL数据库
    """
    print("读取股票基本信息...")

    data = read_stock_info_csv()
    # 保存至mysql
    conn = mysql.connector.connect(
        host="10.200.0.20",
        user="root",
        password="test",
        database="nekoshare",
    )
    cursor = conn.cursor()

    for data in data.itertuples(index=False):
        sql = """
                INSERT INTO stock_data (stock_code, stock_name, price, open, high, low, percent_change, pre_close, quantity_ratio, float_share, float_cap, pe_ratio, industry, area)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                pe_ratio = VALUES(pe_ratio),
                industry = VALUES(industry),
                area = VALUES(area)
        """
        data = (
            data.stock_code,
            data.stock_name,
            data.price,
            data.open,
            data.high,
            data.low,
            data.percent_change,
            data.pre_close,
            data.quantity_ratio,
            data.float_share,
            data.float_cap,
            data.pe_ratio,
            data.industry,
            data.area
        )
        cursor.execute(sql, data)
    
    conn.commit()
    cursor.close()
    conn.close()


def load_stock_day_price_to_mysql():
    """
    读取沪深主板日线数据，并保存至MySQL数据库
    """

    t_start = time.time()
    print("读取沪深主板数据...")
    # 读取上证主板和深证主板的日线数据
    sh_data = read_sh_main()
    sz_data = read_sz_main()

    stocks_data = {**sh_data, **sz_data}

    # 保存至mysql
    conn = mysql.connector.connect(
        host="10.200.0.20",
        user="root",
        password="test",
        database="nekoshare",
    )

    total = stocks_data.__len__()
    count = 1
    cursor = conn.cursor()
    for code, df in stocks_data.items():
        print(f"\r正在处理股票代码: {code} ({count}/{total}) {(count / total)*100:.0f}%", end="")
        count += 1

        sql = """
                INSERT INTO stock_day_price (stock_code, stock_name, trade_date, open, close, high, low, pre_close, volume, amount, close_at_limit_high)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                stock_name = VALUES(stock_name),
                open = VALUES(open),
                close = VALUES(close),
                high= VALUES(high),
                low = VALUES(low),
                pre_close = VALUES(pre_close),
                volume = VALUES(volume),
                amount = VALUES(amount),
                close_at_limit_high = VALUES(close_at_limit_high)
                """
        records = [
            (code, "", day.date, day.open, day.close, day.high, day.low, day.last_close, day.volume, day.amount, 1 if day.close_at_limit_high else 0)
            for day in df.itertuples(index=False)
        ]
        cursor.executemany(sql, records)
    else:
        print("")

    conn.commit()
    cursor.close()
    conn.close()
    t_end = time.time()
    print(f"数据处理完成，耗时: {t_end - t_start:.2f}秒")


def load_pre_open_data_to_mysql():
    """
    读取集合竞价数据，并保存至MySQL数据库
    """
    print("读取股票集合竞价信息...")

    data = read_stock_info_csv()
    # 保存至mysql
    conn = mysql.connector.connect(
        host="10.200.0.20",
        user="root",
        password="test",
        database="nekoshare",
    )
    cursor = conn.cursor()

    for data in data.itertuples(index=False):
        sql = """
                INSERT INTO stock_data (stock_code, stock_name, price, open, high, low, percent_change, pre_close, quantity_ratio, float_share, float_cap, pe_ratio, industry, area)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
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
                pe_ratio = VALUES(pe_ratio),
                industry = VALUES(industry),
                area = VALUES(area)
        """
        vals = (
            data.stock_code,
            data.stock_name,
            data.price,
            data.open,
            data.high,
            data.low,
            data.percent_change,
            data.pre_close,
            data.quantity_ratio,
            data.float_share,
            data.float_cap,
            data.pe_ratio,
            data.industry,
            data.area
        )
        cursor.execute(sql, vals)

        sql = """
                INSERT INTO stock_day_price (stock_code, stock_name, trade_date, open, close, high, low, pre_close, volume, amount, close_at_limit_high)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON DUPLICATE KEY UPDATE
                stock_name = VALUES(stock_name),
                open = VALUES(open),
                close = VALUES(close),
                high= VALUES(high),
                low = VALUES(low),
                pre_close = VALUES(pre_close),
                volume = VALUES(volume),
                amount = VALUES(amount),
                close_at_limit_high = VALUES(close_at_limit_high)
                """
        vals = (
            data.stock_code,
            data.stock_name,
            str(date.today()),
            data.open,
            data.price,
            data.high,
            data.low,
            data.pre_close,
            0,  # volume
            0,  # amount
            0
        )
        cursor.execute(sql, vals)

   

    
    conn.commit()
    cursor.close()
    conn.close()


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "pre":
        # 读取集合竞价数据并保存到MySQL
        load_pre_open_data_to_mysql()
        sys.exit(0)

    #收盘数据下载
    load_stock_info_to_mysql()
    load_stock_day_price_to_mysql()