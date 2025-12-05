from model import Candlestick
from model import TrendLine
from entity import StockDayPrice
import queue
import group_breakout.fetch as nk
from model import BreakoutStrategyExecutingResult
def get_rise_trend_line(candlesticks: list[StockDayPrice]) -> list[TrendLine]:
    """
    获取上升趋势线

    流程为：
        寻找当前给定区间的最低点L1，向右寻找高点H1，直到出现反包阴K线，此时H1为当前上升波段最高点，记录correction=true，即发生回调

        以H1为开始向右寻找新高点H2，H2与H1同理，也是最高点，且H2 > H1，记录H1与H2之间的最低点为L2

        每次出现最低点时，保存该点至important_low_points

        将L2替换L1，重复上述过程

        趋势线为important_low_points的各点连线，其中要求左侧点位低于右侧点位


    param candlesticks: K线
    return: 趋势线
    """
    ret = []
    if len(candlesticks) <= 2:
        return ret
    
    important_low_points = set()


    L1 = 0
    for i, candlestick in enumerate(candlesticks):
        if candlestick.low < candlesticks[L1].low:
            L1 = i
    important_low_points.add(L1)

    while True:
        #寻找当前区间的最低点
        print("L1:", candlesticks[L1].trade_date, candlesticks[L1].low)
        H1 = L1
        correction = False
        for i in range(L1 + 1, len(candlesticks)):
            if candlesticks[i].high >= candlesticks[H1].high:
                H1 = i
            else:
                correction = True
                print("出现回调，当前最高点为", candlesticks[H1].trade_date, candlesticks[H1].high)
                break
        
        H2 = H1
        L2 = H1
        for i in range(H1 + 1, len(candlesticks)):
            if candlesticks[i].high >= candlesticks[H2].high:
                H2 = i
                print("更新H2为", candlesticks[H2].trade_date, candlesticks[H2].high, H2, H1)

                L2 = H2
                for j in range(H1 + 1, H2):
                    if candlesticks[j].low <= candlesticks[L2].low:
                        L2 = j
                important_low_points.add(L2)
                print("关键低点", candlesticks[L2].trade_date, candlesticks[L2].low)
                #更新L1与H1
                L1 = L2
                
        if H2 == H1:
            break
    #生成趋势线
    important_low_points = sorted(list(important_low_points))
    for i in range(len(important_low_points)-1):
        for j in range(i+1, len(important_low_points)):
            p1 = important_low_points[i]
            p2 = important_low_points[j]
            if p2 - p1 < 7:
                continue
            if candlesticks[p2].low > candlesticks[p1].low:
                line = TrendLine(
                    start_date=candlesticks[p1].trade_date,
                    end_date=candlesticks[p2].trade_date,
                    low_price=candlesticks[p1].low,
                    high_price=candlesticks[p2].low,
                    si=p1,
                    di=p2,
                    slope=(candlesticks[p2].low - candlesticks[p1].low) / (p2 - p1),
                    intercept=candlesticks[p1].low - ((candlesticks[p2].low - candlesticks[p1].low) / (p2 - p1)) * p1
                )
                ret.append(line)
    ret = sorted(ret, key=lambda x: x.end_date)
    #TODO: 过滤趋势线，要求尽可能的将K线收于趋势线之上


    def filter_trend_line(line: TrendLine):
        #斜率与截距计算
        n = len(candlesticks)
        hold_count = 0
        for i in range(n):
            trend_price = line.slope * i + line.intercept
            if candlesticks[i].low >= trend_price:
                hold_count += 1
        line_score = hold_count / n
        return line_score

    ret = sorted(ret, key=lambda x: filter_trend_line(x))
    return ret[-3:]

    # highest_price = candlesticks[start_index].high
    # highest_index = start_index   

    # lowest_price = candlesticks[start_index].low
    # lowest_index = start_index
    # correction = False
    # important_low_points = [start_index,]
    # important_low_points_2 = [start_index,]



    # rise_region = candlesticks[start_index:]
    # for i, candlestick in enumerate(rise_region):
    #     print(candlestick.trade_date, candlestick.high, candlestick.low, lowest_price, highest_price, correction)
    #     if candlestick.high == highest_price:
    #         continue

    #     if candlestick.high > highest_price:
    #         #如果新高，则切换最高点
    #         highest_price = candlestick.high
    #         highest_index = i 
    #         #
    #         #同时当前区间的重要低点即为当前区间的最低点（后续还需要调整，以右侧K线为优先）
    #         if correction:
    #             if lowest_price < min([rise_region[p].low for p in important_low_points_2]):
    #                 important_low_points_2.append(lowest_index)
    #                 correction = False
    #             last_important_low_price = rise_region[important_low_points[-1]].low
    #             if last_important_low_price < rise_region[lowest_index].low:
    #                 important_low_points.append(lowest_index)
    #                 correction = False
    #     else:
    #         if correction == False:
    #             lowest_price = candlestick.low
    #             lowest_index = i
    #             correction = True
    #         #否则需要判断是否新低，更新最低点
    #         if candlestick.low < lowest_price:
    #             lowest_price = candlestick.low
    #             lowest_index = i
        
    # print("重要低点")
    # for p in important_low_points:
    #     print(rise_region[p].trade_date, rise_region[p].low)

    # print("重要低点2")
    # for p in important_low_points_2:
    #     print(rise_region[p].trade_date, rise_region[p].low)

    # for i in range(len(important_low_points)-1):
    #     for j in range(i+1, len(important_low_points)):
    #         p1 = important_low_points[i]
    #         p2 = important_low_points[j]
    #         if rise_region[p2].low >= rise_region[p1].low:
    #             line = TrendLine(
    #                 start_date=rise_region[p1].trade_date,
    #                 end_date=rise_region[p2].trade_date,
    #                 low_price=rise_region[p1].low,
    #                 high_price=rise_region[p2].low,
    #             )
    #             ret.append(line)
    # print("趋势线")
    # for line in ret:
    #     print(line)
    # return ret



def get_down_trend_line(candlesticks: list[Candlestick]) -> list[TrendLine]:
    """
    寻找下降趋势线

    思路是：寻找当前最高点与最低点，如果最高点先于最低点，则寻找，否则返回空列表
    """

    ret = []
    if len(candlesticks) <= 2:
        return ret
    
    important_low_points = set()


    L1 = 0
    for i, candlestick in enumerate(candlesticks):
        if candlestick.high > candlesticks[L1].high:
            L1 = i
    important_low_points.add(L1)

    while True:
        #寻找当前区间的最低点
        print("L1:", candlesticks[L1].trade_date, candlesticks[L1].low)
        H1 = L1
        correction = False
        for i in range(L1 + 1, len(candlesticks)):
            if candlesticks[i].low <= candlesticks[H1].low:
                H1 = i
            else:
                correction = True
                print("出现回调，当前最高点为", candlesticks[H1].trade_date, candlesticks[H1].high)
                break
        
        H2 = H1
        L2 = H1
        for i in range(H1 + 1, len(candlesticks)):
            if candlesticks[i].low <= candlesticks[H2].low:
                H2 = i
                print("更新H2为", candlesticks[H2].trade_date, candlesticks[H2].high, H2, H1)

                L2 = H2
                for j in range(H1 + 1, H2):
                    if candlesticks[j].high >= candlesticks[L2].high:
                        L2 = j
                important_low_points.add(L2)
                print("关键低点", candlesticks[L2].trade_date, candlesticks[L2].low)
                #更新L1与H1
                L1 = L2
                
        if H2 == H1:
            break
    #生成趋势线
    important_low_points = sorted(list(important_low_points))
    for i in range(len(important_low_points)-1):
        for j in range(i+1, len(important_low_points)):
            p1 = important_low_points[i]
            p2 = important_low_points[j]
            # if p2 - p1 < 7:
                # continue
            if candlesticks[p2].high < candlesticks[p1].high:
                line = TrendLine(
                    start_date=candlesticks[p1].trade_date,
                    end_date=candlesticks[p2].trade_date,
                    low_price=candlesticks[p1].high,
                    high_price=candlesticks[p2].high,
                    si=p1,
                    di=p2,
                    slope=(candlesticks[p2].high - candlesticks[p1].high) / (p2 - p1),
                    intercept=candlesticks[p1].high - ((candlesticks[p2].high - candlesticks[p1].high) / (p2 - p1)) * p1
                )
                ret.append(line)
    ret = sorted(ret, key=lambda x: x.end_date)
    #TODO: 过滤趋势线，要求尽可能的将K线收于趋势线之上


    def filter_trend_line(line: TrendLine):
        #斜率与截距计算
        n = len(candlesticks)
        hold_count = 0
        for i in range(n):
            trend_price = line.slope * i + line.intercept
            if candlesticks[i].low >= trend_price:
                hold_count += 1
        line_score = hold_count / n
        return line_score

    # ret = sorted(ret, key=lambda x: filter_trend_line(x))
    return ret[-3:]

    
        

def breakout(
    resultQueue: queue.Queue[BreakoutStrategyExecutingResult],
    start_date="20250601",
    end_date="20251027",
):
    pass

if __name__ == "__main__":
    candlesticks = nk.get_stock_day_price("600268", start_date="20250623", end_date="20251125")
    get_rise_trend_line(candlesticks)