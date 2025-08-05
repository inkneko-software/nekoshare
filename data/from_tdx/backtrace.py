import struct
import pandas as pd
from pathlib import Path
import matplotlib.pyplot as plt
from datetime import datetime, timedelta,date
import time

day_range = 180

"""
读取股票日线数据，并返回一个包含日期、开盘价、最高价、最低价、收盘价、成交金额和成交量的DataFrame
"""


def read_day_file(filepath):
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


"""
读取上证主板日线数据

返回字典,key=证券代码,value=pd.DataFrame，DataFrame定义见read_day_file()
"""


def read_sh_main():
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
        if stock_history["date"].iloc[-1] < (datetime.now() - timedelta(days=90)).date():
            continue
        data[file] = stock_history
    return data


"""
读取上证主板某个证券的日线数据

返回pd.DataFrame，DataFrame定义见read_day_file()
"""


def read_sh_main_code(code):
    sh_dir = "hsjday/sh/lday"
    folder = Path(sh_dir)
    data = {}
    today = pd.Timestamp.today()
    start_date = today - pd.Timedelta(days=day_range)
    stock_history = read_day_file(sh_dir + "/" + code)
    # recent_data = stock_history[(stock_history["date"] >= start_date.date())]
    return stock_history


"""
读取深证主板日线数据

返回字典,key=证券代码,value=pd.DataFrame，DataFrame定义见read_day_file()
"""


def read_sz_main():
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
        if stock_history["date"].iloc[-1] <( datetime.now() - timedelta(days=90)).date():
            continue
        data[file] = stock_history
    return data


"""
读取深证主板某个证券的日线数据

返回pd.DataFrame，DataFrame定义见read_day_file()
"""


def read_sz_main_code(code):
    sh_dir = "hsjday/sz/lday"
    folder = Path(sh_dir)

    data = {}
    today = pd.Timestamp.today()
    start_date = today - pd.Timedelta(days=day_range)
    stock_history = read_day_file(sh_dir + "/" + code)
    # recent_data = stock_history[(stock_history["date"] >= start_date.date())]
    return stock_history


# 符合模型的数量
matched_total = 0
# 当日涨停的数量
limit_high_total = 0
# 三日内上涨的数量
raise_3days = 0
# 三日内下跌的数量
fall_3days = 0
# 七日内上涨的数量
raise_7days = 0
# 七日内下跌的数量
fall_7days = 0


def model_a(code, data):
    """
    模型A：集合竞价跳开2%-5%
    :param data: 某一只股票的全部日线信息，为DataFrame类型，定义见read_day_file()
    """

    global matched_total, limit_high_total, raise_3days, fall_3days, raise_7days, fall_7days
    data = list(data.itertuples(index=False))
    # 遍历当前股票的日线数据
    for i in range(len(data)):
        row = data[i]
        # 计算高开百分比
        open_high_percent = (row.open - row.last_close) / row.last_close * 100
        # 如果符合模型，即高开在2%到5%
        if open_high_percent >= 2 and open_high_percent <= 5:

            matched_total += 1
            # 如果收盘涨停
            if row.close_at_limit_high:
                limit_high_total += 1
            # 获取后三日的数据
            after_3days = data[i + 2 : i + 5]
            # 获取后三日的收盘价
            if len(after_3days) > 0:
                max_high = max([x.high for x in after_3days])
                if max_high >= row.close:
                    raise_3days += 1
                    print(
                        f"股票代码: {code}, 日期: {row.date}, 高开百分比: {open_high_percent:.2f}%, 当日涨停：{row.close_at_limit_high}, 三日内上涨最高差价: {max_high - row.close:.2f}"
                    )
                else:
                    fall_3days += 1

            # 获取后七日的数据
            after_7days = data[i + 2 : i + 9]
            # 获取后七日的收盘价
            if len(after_7days) > 0:
                max_high = max([x.high for x in after_7days])
                if max_high >= row.close:
                    raise_7days += 1
                else:
                    fall_7days += 1

        print(
            f"符合条件的数量: {matched_total}, 当日涨停数量: {limit_high_total}, 三日内上涨: {raise_3days}, 三日内下跌: {fall_3days}, 七日内上涨: {raise_7days}, 七日内下跌: {fall_7days}"
        )
        # results.append((row.date,code, row.open, row.close, row.last_close, open_high_percent, row.close_at_limit_high))


def model_a_optimized(code, data, today_open):
    """
    模型A：跳开形成的箱体形态突破：一定时间内平台箱体盘整，集合竞价跳开2%-5%，7日内最高价与最低价差价小于10%，多周期内高于当前集合竞价的日K线不超过N个
    :param data: 某一只股票的全部历史日线信息，为DataFrame类型，定义见read_day_file()。
    :param today_open: 当日开盘价
    :return: 一个字典，见ret定义
    """
    ret = {
        "open_high_percent": 0,  # 高开幅度，若不符合高开条件，则下列数据全部不进行计算
        "fit_open_high": False,  # 是否符合高开条件
        "float_ratio_7days": 0,  # 7日波动率
        "fit_float_ratio_7days": False,  # 是否符合7日波动率条件
        "float_ratio_15days": 0,  # 15日波动率
        "fit_float_ratio_15days": False,  # 是否符合15日波动率条件
        "float_ratio_30days": 0,  # 30日波动率
        "fit_float_ratio_30days": False,  # 是否符合30日波动率条件
        "meaning_close_90days": 0,  # 90日平均收盘价
        "meaning_difference_ratio_90days": 0,  # 90日平均收盘价与当日开盘价的差值
        "higher_than_today_open_90days": 0,  # 90日内高于当日开盘价的日K线数量
        "fit_higher_than_today_open_90days": False,  # 是否符合高于当日开盘价的日K线数量条件
        "higher_than_today_open_180days": 0,  # 180日高于当日开盘价的日K线数量
        "fit_higher_than_today_open_180days": False,  # 是否符合高于当日开盘价的日K线数量条件
    }

    last_close = data["close"].iloc[-1]
    # 高开幅度
    open_high_percent = (today_open - last_close) / last_close * 100
    ret["open_high_percent"] = open_high_percent
    # 若不符合高开条件，停止计算
    if open_high_percent >= 2 and open_high_percent <= 5:
        ret["fit_open_high"] = True
    else:
        return ret

    # 前90日数据
    data_90days = data.iloc[-90:]

    # 7日波动率：最高价与最低价的相差百分比
    float_ratio_7days = (
        data.iloc[-7:]["high"].max() / data.iloc[-7:]["low"].min() - 1
    ) * 100
    ret["float_ratio_7days"] = float_ratio_7days
    # 如果7日波动率大于10%，则不符合模型
    if float_ratio_7days <= 10:
        ret["fit_float_ratio_7days"] = True

    # 15日波动率：最高价与最低价的相差百分比
    float_ratio_15days = (
        data.iloc[-15:]["high"].max() / data.iloc[-15:]["low"].min() - 1
    ) * 100
    ret["float_ratio_15days"] = float_ratio_15days
    # 如果15日波动率大于10%，则不符合模型
    if float_ratio_15days <= 10:
        ret["fit_float_ratio_15days"] = True

    # 30日波动率：最高价与最低价的相差百分比
    float_ratio_30days = (
        data.iloc[-30:]["high"].max() / data.iloc[-30:]["low"].min() - 1
    ) * 100
    ret["float_ratio_30days"] = float_ratio_30days
    # 如果30日波动率大于10%，则不符合模型
    if float_ratio_30days <= 12:
        ret["fit_float_ratio_30days"] = True

    # 90日平均收盘价
    meaning_90days = data_90days["close"].mean()
    ret["meaning_close_90days"] = meaning_90days

    # 90日平均收盘价与当日开盘价的差值
    meaning_difference_ratio_90days = (
        (today_open - meaning_90days) / meaning_90days * 100
    )
    ret["meaning_difference_ratio_90days"] = meaning_difference_ratio_90days

    # 90日高于当日开盘价的日K线数量
    higher_than_today_open_90days = len(data_90days[(data_90days["high"] > today_open)])
    ret["higher_than_today_open_90days"] = higher_than_today_open_90days
    # 如果高于当日开盘价的日K线数量大于10，则不符合模型
    if higher_than_today_open_90days < 5:
        ret["fit_higher_than_today_open_90days"] = True

    # 180日高于当日开盘价的日K线数量
    data_180days = data.iloc[-180:]
    higher_than_today_open_180days = len(
        data_180days[(data_180days["high"] > today_open)]
    )
    ret["higher_than_today_open_180days"] = higher_than_today_open_180days
    # 如果高于当日开盘价的日K线数量大于10，则不符合模型
    if higher_than_today_open_180days < 10:
        ret["fit_higher_than_today_open_180days"] = True

    return ret
    # print(f"股票代码: {code}, 平均收盘价: {meaning:.2f}, 最高价: {data['high'].max():.2f}, 最高价偏离幅度：{ (((data['high'].max()/ meaning) - 1)*100):.2f}% 最低价: {data['low'].min():.2f}")


def test():
    global matched_total, limit_high_total, raise_3days, fall_3days, raise_7days, fall_7days

    # 获取日线数据
    # sh_stks = read_sh_main()
    code = "sz001239.day"
    data = read_sz_main_code(code)
    today_data = data[-1:]
    history_data = data[:-1]

    # print(history_data)

    print(model_a_optimized(code, history_data, today_data["open"].iloc[0]))


def backtrace_model_a_optimized():
    global matched_total, limit_high_total, raise_3days, fall_3days, raise_7days, fall_7days

    # 获取日线数据
    sh_stks = read_sh_main()
    sz_stks = read_sz_main()

    stks_day_data = {**sh_stks, **sz_stks}

    results = []
    for code, data in stks_day_data.items():
        # 忽略掉近期没有数据的股票
        if len(data) == 0:
            continue

        ret = model_a_optimized(code, data[:-1], data[-1:]["open"].iloc[0])
        if ret["fit_open_high"]: #and data['close_at_limit_high'].iloc[-1]
            print(f"股票代码: {code}, 高开百分比: {ret['open_high_percent']:.2f}%, 7/15/30日涨幅: {ret['float_ratio_7days']:.2f}% {ret['float_ratio_15days']:.2f}% {ret['float_ratio_30days']:.2f}%, 90日距箱体中轴涨幅: {ret["meaning_difference_ratio_90days"]:.2f}%, 高于当日开盘价的日K线数量 90/180: {ret['higher_than_today_open_90days']} {ret['higher_than_today_open_180days']}, 涨停: {data['close_at_limit_high'].iloc[-1]}")

            matched_total += 1
            if data["close_at_limit_high"].iloc[-1]:
                limit_high_total += 1
            results.append(ret)
            
    print(
        f"符合条件的数量: {matched_total}, 当日涨停数量: {limit_high_total}, 三日内上涨: {raise_3days}, 三日内下跌: {fall_3days}, 七日内上涨: {raise_7days}, 七日内下跌: {fall_7days}"
    )
    print(
        f"涨停比率： {limit_high_total / matched_total * 100:.2f}%, 三日内上涨比率： {raise_3days / matched_total * 100:.2f}%, 三日内下跌比率： {fall_3days / matched_total * 100:.2f}%, 七日内上涨比率： {raise_7days / matched_total * 100:.2f}%, 七日内下跌比率： {fall_7days / matched_total * 100:.2f}%"
    )


def backtrace():
    global matched_total, limit_high_total, raise_3days, fall_3days, raise_7days, fall_7days

    # 获取日线数据
    sh_stks = read_sh_main()
    sz_stks = read_sz_main()

    stks_day_data = {**sh_stks, **sz_stks}

    for code, data in stks_day_data.items():
        model_a(code, data)
        # 打印符合条件的股票代码、日期和高开百分比
        # print(f"股票代码: {row.code}, 日期: {row.date}, 高开百分比: {row.open_high_percent:.2f}, 当日涨停：{row.close_at_limit_high}")

    print(
        f"符合条件的数量: {matched_total}, 当日涨停数量: {limit_high_total}, 三日内上涨: {raise_3days}, 三日内下跌: {fall_3days}, 七日内上涨: {raise_7days}, 七日内下跌: {fall_7days}"
    )
    print(
        f"涨停比率： {limit_high_total / matched_total * 100:.2f}%, 三日内上涨比率： {raise_3days / matched_total * 100:.2f}%, 三日内下跌比率： {fall_3days / matched_total * 100:.2f}%, 七日内上涨比率： {raise_7days / matched_total * 100:.2f}%, 七日内下跌比率： {fall_7days / matched_total * 100:.2f}%"
    )
    # df.to_excel("backtrace_results.xlsx", index=False, engine='openpyxl')


if __name__ == "__main__":
    start_time = time.time()

    backtrace_model_a_optimized()

    stop_time = time.time()
    print(f"耗时: {stop_time - start_time:.2f}秒")
