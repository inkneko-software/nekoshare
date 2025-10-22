from decimal import Decimal
import sys
import time
import akshare as ak
import mysql.connector
from datetime import datetime, timedelta, date
import math

conn = mysql.connector.connect(
            host="10.200.0.20",
            user="root",
            password="test",
            database="nekoshare",
        )

def get_trend_lines(code: str, start_date: str, end_date: str):
    """
    在指定日期范围内获取股票的趋势线数据。趋势线将综合贴合程度与时间周期进行排序
    :param code: 股票代码
    :param start_date: 起始日期，格式为 'YYYY-MM-DD'
    :param end_date: 结束日期，格式为 'YYYY-MM-DD'
    :return: 包含趋势线数据的数组，元素为字典，定义见代码
    """

    cursor = conn.cursor()

    sql = """
        SELECT stock_code, stock_name, open, close, high, low, pre_close, volume, trade_date FROM stock_day_price
        WHERE stock_code = %s AND trade_date BETWEEN %s AND %s
        """
    data = (code, start_date, end_date)
    cursor.execute(sql, data)
    period_prices = cursor.fetchall()

    """
    当前周期内，枚举所有可能的趋势线
    趋势线左端为周期内某一高点的最高价，趋势线右端为周期内某一低点的最高价
    左侧高点一定在右侧低点的前面，且两点之间至少间隔3个交易日
    该趋势线使得大部分的价格在趋势线下方，且贴合程度最高
    贴合度考虑两个方面，在趋势线周期内，一个是价格在趋势线下方的交易日数量占比，以及这些价格当日的与趋势线价格的差值的平均值
    """
    
    ret = []
    n = len(period_prices)

    for i, price in enumerate(period_prices):
        high_price = price[4]
        high_date = price[8]
        #在高点的后三个交易日之后开始找趋势线的另一侧
        for j in range(i + 3, n):
            low_price = period_prices[j][4]
            low_date = period_prices[j][8]
            if period_prices[j][3] > high_price:
                break
            #斜率
            slope = (low_price - high_price) / (j - i)
            #截距
            intercept = high_price - slope * i

            below_count = 0
            total_diff = Decimal(0.0)
            for k in range(i, j + 1):
                trend_price = slope * k + intercept
                actual_price = period_prices[k][3]
                if actual_price < trend_price:
                    below_count += 1
                    total_diff += abs(trend_price - actual_price)

            below_ratio = below_count / (j - i + 1)
            avg_diff = total_diff / below_count if below_count > 0 else float('inf')
            if below_ratio < 0.8:
                continue
            if j - i + 1 < 10:
                continue
            ret.append({
                "start_date": high_date,
                "end_date": low_date,
                "slope": slope,
                "intercept": intercept,
                "below_ratio": below_ratio,
                "avg_diff": avg_diff,
                "duration": j - i + 1
            })

    cursor.close()
    ret.sort(key=lambda x:  ( x["avg_diff"]))

    return ret[:30]  # 返回前10个趋势线



def main():

    total = 0;
    matched = 0;
    current_time = datetime.strptime("2025-08-26", '%Y-%m-%d').date()
    
    cursor = conn.cursor()
    sql = "SELECT stock_code FROM stock_data"
    cursor.execute(sql)
    stock_codes = [row[0] for row in cursor.fetchall()]
    # stock_code = "601698"
    for stock_code in stock_codes:
        if not (stock_code.startswith("600") or stock_code.startswith("601") or stock_code.startswith("603") or stock_code.startswith("605") 
            or stock_code.startswith("000") or stock_code.startswith("001") or stock_code.startswith("002")):
            continue

        total += 1
        trend_lines = get_trend_lines(stock_code, '2025-07-01', '2025-08-26')
        trend_lines = trend_lines[:3]
        trade_lines = [l for l in trend_lines if l['end_date'] >= current_time - timedelta(days=3) and l['end_date'] != current_time and l['duration'] >= 15]
        if len(trade_lines) == 0:
            continue

        matched += 1
        # print(f"Stock code: {stock_code}")
        print(stock_code)
        # for line in trade_lines:
            # print(f"from {line['start_date']} to {line['end_date']}, slope: {line['slope']:.2f}, intercept: {line['intercept']:.2f}, below_ratio: {line['below_ratio']:.2f}, avg_diff: {line['avg_diff']:.2f}, duration: {line['duration']}")
            
    # print(f"Total: {total}, Matched: {matched}")
    cursor.close()





if __name__ == "__main__":
    main()


conn.close()