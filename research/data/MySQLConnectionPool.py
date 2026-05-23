from mysql.connector import pooling
from mysql.connector import Error
import mysql.connector
import os
import threading
from contextlib import contextmanager

from utils.log import LoggerFactory

log = LoggerFactory.get_logger(__name__)

mysql_host = os.environ.get("DB_HOST")
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
            self.pool = pooling.MySQLConnectionPool(
                host=mysql_host,
                user=mysql_user,
                password=mysql_passwd,
                database="nekoshare",
                pool_name="nekoshare_pool",
                pool_size=10,
                pool_reset_session=True,
                autocommit=False,
            )

            log.info("MySQL connection pool initialized")

        except Exception as e:
            log.exception("Failed to initialize MySQL pool")
            raise e

    @contextmanager
    def _get_cursor(self, dictionary=False):
        conn = None
        cursor = None

        try:
            conn = self.pool.get_connection()

            # 防止连接失效
            if not conn.is_connected():
                conn.reconnect(attempts=3, delay=1)

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
        conn = self.pool.get_connection()

        if not conn.is_connected():
            conn.reconnect(attempts=3, delay=1)

        return conn