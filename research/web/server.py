import uvicorn
from fastapi import FastAPI
from utils.log import LoggerFactory
log = LoggerFactory.get_logger(__name__)


from web.quote import router as quote_router
from web.strategy import router as strategy_router
from web.focus import router as focus_router

app = FastAPI()

app.include_router(quote_router)
app.include_router(strategy_router)
app.include_router(focus_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3010)
