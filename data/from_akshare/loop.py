import sys
import time
import akshare as ak
import mysql.connector
from datetime import datetime, timedelta, date
import math

def fetch_day_price():
    try:
        conn = mysql.connector.connect(
            host="10.200.0.20",
            user="root",
            password="test",
            database="nekoshare",
        )
        #https://tushare.pro/document/2?doc_id=372 沪深京实时日线
        data = ak.stock_zh_a_spot_em()
        data = data.rename(columns={'市盈率-动态': 'pe_dynamic'})
        print(f"{time.strftime('%Y-%m-%d %H:%M')} 已拉取实时日线数据, 共{len(data)}条")
        
        cursor = conn.cursor()

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
                data.代码,
                data.名称,
                str(date.today()),
                data.今开,
                data.最新价,
                data.最高,
                data.最低,
                data.昨收,
                data.成交量*100,
                data.成交额,
                data.最新价 == round(data.昨收 * 1.1, 2) 
            )
            cursor.execute(sql, vals)

        

        
        conn.commit()
        print(f"{time.strftime('%Y-%m-%d %H:%M')} 数据已存入数据库")
    except KeyboardInterrupt:
        print("进程由用户终止")
    cursor.close()
    conn.close()

if __name__ == "__main__":
    
    while True:
        #在9点25分拉取一次数据，在9点35分后拉取一次数据
        #9点35分后每30分钟拉取一次数据
        #周末不拉取数据
        current_time = datetime.now()
        if current_time.weekday() < 5:  # 5=Saturday, 6=Sunday
            if current_time.hour == 9 and current_time.minute == 25 and current_time.second > 10:
                print(f"{time.strftime('%Y-%m-%d %H:%M')} 集合竞价结束，拉取数据...")
                fetch_day_price()
                time.sleep(60*5)
            elif (current_time.hour == 9 and current_time.minute >= 35 ) or (current_time.hour >= 10 and current_time.hour < 16):
                print(f"{time.strftime('%Y-%m-%d %H:%M')} 每30分钟拉取数据...")
                fetch_day_price()
                time.sleep(60*30)

        time.sleep(1)  
        
        

        
