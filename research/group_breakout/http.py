from datetime import date
from typing import Optional
from fastapi import FastAPI, WebSocket
from pydantic import BaseModel
import uvicorn
import group_breakout.fetch as nk
from group_breakout.breakout import *

# class Input(BaseModel):
#     a: float
#     b: float

app = FastAPI()
base_url = "/api/pysdk"


@app.get(base_url + "/stock/getStockDayPrice")
def add(code: str, start_date: str = "20140101", end_date: str = None):
    prices = nk.get_stock_day_price(code, start_date, end_date)
    return {"data": prices}

@app.get(base_url + "/ths/getIndustryDayPrice")
def get_industry_day_price(code: str, start_date: str = "20140101", end_date: str = "20990101"):
    prices = nk.get_ths_industry_day_price(code, start_date, end_date)
    return {"data": prices}

@app.get(base_url + "/ths/fetch_industry_market")
def fetch_industry_market():
    nk.fetch_and_save(True)
    return {"code": 200, "msg": "ok"}


class BreakoutResult(BaseModel):
    is_break_out: bool
    new_high_days: float


class BreakoutStrategyExecutingResult(BaseModel):
    type: str
    code: str
    name: str
    change_pct: float
    result: BreakoutResult
    rectangle_recent: Optional[Rectangle] = None
    rectangle_large: Optional[Rectangle] = None


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    # 接受客户端连接
    await websocket.accept()
    data = await websocket.receive_text()  # 收到客户端发来的消息
    print("客户端请求:", data)

    # 选取当日突破板块，并选取其成分股中突破的个股
    start_date = "20250601"
    end_date = date.today().strftime("%Y%m%d")
    end_date = "20251022"

    # 获取所有行业板块
    print("获取所有行业板块")
    industries = nk.get_ths_industry_market()
    selected_industries = []
    results = []
    for industry in industries:
        d = []
        i = 0
        print(f"获取板块日线 {industry.code} {industry.name}")
        ret_day = nk.get_ths_industry_day_price(
            code=industry.code,
            start_date=start_date,
            end_date=end_date,  # date.today().strftime("%Y%m%d")
        )
        d = [
            Candlestick(
                date=data.trade_date,
                open=data.open,
                high=data.high,
                low=data.low,
                close=data.close,
                volume=data.volume,
                change_pct=round(
                    (data.close - data.pre_close) / data.pre_close * 100, 2
                ),
                pre_close=data.pre_close,
            )
            for data in ret_day
        ]
        industry.change_pct = d[-1].change_pct
        (a, b) = is_recent_flat_consolidation(d)
        if (
            d[-1].change_pct > 0
            and (result := is_break_out(d))
            and result.new_high_days > 5
        ):
            industry.result = result
            industry.a = a
            industry.b = b
            selected_industries.append(industry)

    selected_industries.sort(key=lambda ind: ind.change_pct, reverse=True)
    # 获取所有选中板块的成分股
    for industry in selected_industries:
        await websocket.send_text(
            BreakoutStrategyExecutingResult(
                type="industry",
                code=industry.code,
                name=industry.name,
                change_pct=float(industry.change_pct),
                result=BreakoutResult(
                    is_break_out=industry.result.is_break_out,
                    new_high_days=industry.result.new_high_days,
                ),
                rectangle_recent=industry.a,
                rectangle_large=industry.b,
            ).model_dump_json()
            # f"突破板块: {industry.name}, {industry.change_pct}% {industry.result}"
        )  # 回发给客户端

        stocks = nk.get_ths_industry_stocks(industry.code)
        for stock in stocks:
            # 只做主板
            if not stock.stock_code.startswith(("6", "0")):
                continue
            if stock.stock_code.startswith(("*", "ST", "退", "N", "C")):
                continue
            d = []
            i = 0
            ret_day = nk.get_stock_day_price(
                code=stock.stock_code,
                start_date=start_date,
                end_date=end_date,  # date.today().strftime("%Y%m%d")
            )
            d = [
                Candlestick(
                    date=data.trade_date,
                    open=data.open,
                    high=data.high,
                    low=data.low,
                    close=data.close,
                    volume=data.volume,
                    change_pct=data.percent_change,
                    pre_close=data.pre_close,
                )
                for data in ret_day
            ]
            (a, b) = is_recent_flat_consolidation(d)
            if (
                d[-1].close > a.high_price
                and (d[-1].close - a.high_price) / a.high_price < 0.06
                and (result := is_break_out(d))
                and result.new_high_days > 5
            ):
                await websocket.send_text(
                    BreakoutStrategyExecutingResult(
                        type="stock",
                        code=stock.stock_code,
                        name=stock.stock_name,
                        change_pct=float(d[-1].change_pct),
                        result=BreakoutResult(
                            is_break_out=result.is_break_out,
                            new_high_days=result.new_high_days,
                        ),
                        rectangle_recent=a,
                        rectangle_large=b,
                    ).model_dump_json()
                )

    await websocket.close()


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=3010)
