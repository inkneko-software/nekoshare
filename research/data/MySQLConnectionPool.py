from mysql.connector import pooling, Error
import os
import threading
import time
from contextlib import contextmanager

from utils.log import LoggerFactory

log = LoggerFactory.get_logger(__name__)

mysql_host = os.environ.get("DB_HOST")
mysql_port = os.environ.get("DB_PORT")
mysql_user = os.environ.get("DB_USER")
mysql_passwd = os.environ.get("DB_PASSWORD")


class MySQLConnectionPool:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    instance = super(MySQLConnectionPool, cls).__new__(cls)
                    instance.__init_connection()
                    cls._instance = instance
        return cls._instance

    def __init_connection(self):
        try:
            pool_size = int(os.environ.get("DB_POOL_SIZE", 20))
            self.pool = pooling.MySQLConnectionPool(
                host=mysql_host,
                port=mysql_port,
                user=mysql_user,
                password=mysql_passwd,
                database="nekoshare",
                pool_name="nekoshare_pool",
                pool_size=pool_size,
                pool_reset_session=True,
                autocommit=False,
            )

            log.info("MySQL connection pool initialized, pool_size=%d", pool_size)

        except Exception as e:
            log.exception("Failed to initialize MySQL pool")
            raise e

    def _get_connection(self):
        """从池中获取连接，池耗尽时最多重试 3 次"""
        retries = 3
        for attempt in range(retries):
            try:
                conn = self.pool.get_connection()
            except pooling.PoolError:
                if attempt == retries - 1:
                    raise
                log.warning("Pool exhausted, retrying (%d/%d)...", attempt + 1, retries)
                time.sleep(0.3 * (attempt + 1))
                continue

            if not conn.is_connected():
                try:
                    conn.reconnect(attempts=3, delay=1)
                except Error:
                    conn.close()
                    continue
            return conn

        raise pooling.PoolError("Failed getting connection; pool exhausted after retries")

    @contextmanager
    def _get_cursor(self, dictionary=False):
        conn = None
        cursor = None

        try:
            conn = self._get_connection()
            cursor = conn.cursor(dictionary=dictionary)
            yield conn, cursor

        except Exception:
            if conn:
                conn.rollback()
            raise

        finally:
            try:
                if cursor:
                    cursor.close()
            except Exception:
                pass

            try:
                if conn:
                    conn.close()
            except Exception:
                pass

    def query(self, sql: str, vals: tuple = ()):
        """
        通用查询接口
        SELECT -> 返回结果
        INSERT/UPDATE/DELETE -> 返回 affected rows
        """
        with self._get_cursor() as (conn, cursor):
            cursor.execute(sql, vals)

            sql_type = sql.lstrip().split(" ", 1)[0].lower()

            if sql_type == "select":
                return cursor.fetchall()

            conn.commit()
            return cursor.rowcount

    def queryMany(self, sql: str, vals_list: list[tuple]):
        """
        批量执行
        """
        with self._get_cursor() as (conn, cursor):
            cursor.executemany(sql, vals_list)
            conn.commit()
            return cursor.rowcount

    def query_one(self, sql: str, vals: tuple = ()):
        """
        查询单条
        """
        with self._get_cursor() as (_, cursor):
            cursor.execute(sql, vals)
            return cursor.fetchone()

    def query_dict(self, sql: str, vals: tuple = ()):
        """
        返回 dict 结果
        """
        with self._get_cursor(dictionary=True) as (_, cursor):
            cursor.execute(sql, vals)
            return cursor.fetchall()

    def execute(self, sql: str, vals: tuple = ()):
        """
        专门执行写操作
        """
        with self._get_cursor() as (conn, cursor):
            cursor.execute(sql, vals)
            conn.commit()
            return cursor.rowcount

    def conn(self):
        """
        保持原接口不变
        调用方需要自己 close()
        """
        return self._get_connection()