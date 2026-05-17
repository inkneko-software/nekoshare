# -- 游资营业部
# CREATE TABLE hot_money(
#     department_name VARCHAR(255) PRIMARY KEY COMMENT '营业部名称',
#     hot_money_name VARCHAR(255) NOT NULL COMMENT '关联的游资名称'
# ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

from dataclasses import dataclass
@dataclass
class HotMoney:
    department_name: str  # 营业部名称
    hot_money_name: str   # 关联的游资名称
    