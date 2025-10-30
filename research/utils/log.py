import logging
import sys
from typing import Optional
import os

class LoggerFactory:
    _initialized = False

    @classmethod
    def _init_logging(cls):
        """只在第一次调用时初始化 logging 全局配置"""
        if cls._initialized:
            return
        
        level_str = os.getenv("LOG_LEVEL", "INFO").upper()
        level = getattr(logging, level_str, logging.INFO)

        logging.basicConfig(
            level=level,
            format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            handlers=[logging.StreamHandler(sys.stdout)]
        )
        cls._initialized = True

    @classmethod
    def get_logger(cls, name: Optional[str] = None) -> logging.Logger:
        """获取 logger，若未初始化则自动配置"""
        cls._init_logging()
        return logging.getLogger(name or __name__)