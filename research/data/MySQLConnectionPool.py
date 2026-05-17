from mysql.connector import pooling
import os
from utils.log import LoggerFactory

log = LoggerFactory.get_logger(__name__)

mysql_host = os.environ.get("DB_HOST")
mysql_user = os.environ.get("DB_USER")
mysql_passwd = os.environ.get("DB_PASSWORD")


class MySQLConnectionPool:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MySQLConnectionPool, cls).__new__(cls)
            cls._instance.__init_connection()
        return cls._instance

    def __init_connection(self):
        pool = pooling.MySQLConnectionPool(
            host=mysql_host,
            user=mysql_user,
            password=mysql_passwd,
            database="nekoshare",
            pool_name="nekoshare_pool",
            pool_size=5,
        )
        self.pool = pool

    def query(self, sql: str, vals: tuple = ()):
        conn = self.pool.get_connection()
        cursor = conn.cursor()
        cursor.execute(sql, vals)
        results = cursor.fetchall()
        conn.commit()
        cursor.close()
        conn.close()
        return results

    def queryMany(self, sql: str, vals_list: list[tuple]):
        conn = self.pool.get_connection()
        cursor = conn.cursor()
        cursor.executemany(sql, vals_list)
        results = cursor.fetchall()
        conn.commit()
        cursor.close()
        conn.close()
        return results

    def conn(self):
        return self.pool.get_connection()