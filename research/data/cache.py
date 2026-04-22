import threading
import redis
from utils.log import LoggerFactory

log = LoggerFactory.get_logger(__name__)

# 股票历史日K线数据缓存
stock_day_price_qfq = {}
stock_day_price_qfq_lock = threading.Lock()
# 股票当日实时日K线数据缓存
stock_current_price = {}
stock_current_price_lock = threading.Lock()

class RedisSubscriber:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
        return cls._instance

    def start(self):
        t = threading.Thread(target=self.listen, daemon=True)
        t.start()

    def listen(self):
        r = redis.Redis(decode_responses=True)
        pubsub = r.pubsub()
        pubsub.subscribe("nekoshare_cache_evict")

        for msg in pubsub.listen():
            if msg["type"] == "message":
                msg_data = msg["data"]
                log.info("收到缓存失效消息: %s", msg_data)
                if msg_data == "stock_day_price_qfq":
                    with stock_day_price_qfq_lock:
                        stock_day_price_qfq.clear()
                    log.info("已清空股票历史日K线数据缓存")
                elif msg_data == "stock_current_price":
                    with stock_current_price_lock:
                        stock_current_price.clear()
                    log.info("已清空股票当日实时日K线数据缓存")

RedisSubscriber().start()