import sys
import time
import tushare as ts
import mysql.connector
from datetime import datetime, timedelta, date

if __name__ == "__main__":
    if (len(sys.argv) < 2): 
        print("Usage: python3 loop.py <token>")
        sys.exit(1)
    token = sys.argv[1]
    ts.set_token(token)  
    pro = ts.pro_api()
    
    conn = mysql.connector.connect(
        host="10.200.0.20",
        user="root",
        password="test",
        database="nekoshare",
    )
    
    while True:
        try:
            #https://tushare.pro/document/2?doc_id=372 沪深京实时日线
            data = pro.rt_k(ts_code='600*.SH,601*.SH,603*.SH,605*.SH,000*.SZ,001*.SZ,002*.SZ')
            print(f"{time.strftime('%Y-%m-%d %H:%M')} 已拉取实时日线数据, 共{len(data)}条")
            
            cursor = conn.cursor()

            for data in data.itertuples(index=False):
                sql = """
                        INSERT INTO stock_data (stock_code, stock_name, price, open, high, low, percent_change, pre_close)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                        ON DUPLICATE KEY UPDATE
                        stock_name = VALUES(stock_name),
                        price = VALUES(price),
                        open = VALUES(open),
                        high = VALUES(high),
                        low = VALUES(low),
                        percent_change = VALUES(percent_change),
                        pre_close = VALUES(pre_close)
                """
                vals = (
                    data.stock_code.strip(".SH").strip(".SZ"),
                    data.stock_name,
                    data.close,
                    data.open,
                    data.high,
                    data.low,
                    round((data.close - data.pre_close)/ data.pre_close * 100,2),
                    data.pre_close,
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
                    data.close,
                    data.high,
                    data.low,
                    data.pre_close,
                    data.volume,
                    data.amount,
                    data.close == round(data.pre_close * 1.1, 2) 
                )
                cursor.execute(sql, vals)

        

            
            conn.commit()
            cursor.close()
            time.sleep(60*15)  # Sleep for 60 seconds before the next request
        except KeyboardInterrupt:
            print("进程由用户终止")
            break
        except Exception as e:
            print(f"异常: {e}")
            time.sleep(60*15)  # Wait before retrying
            continue
        finally:
            conn.close()
