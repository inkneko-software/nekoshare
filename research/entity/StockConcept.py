"""
-- 股票概念
CREATE TABLE stock_concept(
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT 'ID',
    stock_code VARCHAR(20) NOT NULL COMMENT '股票的纯数字代码，如601881',
    stock_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '股票的名称，如中国银河',
    concept_code VARCHAR(20) NOT NULL COMMENT '概念代码，如885907',
    concept_name VARCHAR(50) NOT NULL DEFAULT '' COMMENT '概念名称，如科创次新股',
    `explain` VARCHAR(3000) NOT NULL DEFAULT '' COMMENT '概念解释',
    `weight` INT NOT NULL DEFAULT 0 COMMENT '概念权重，可能为2, 0, -1, 数值越大代表越相关',
    INDEX(stock_code),
    INDEX(concept_code),
    UNIQUE(stock_code, concept_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
"""

from dataclasses import dataclass

@dataclass
class StockConcept:
    id: int
    stock_code: str
    stock_name: str
    concept_code: str
    concept_name: str
    explain: str
    weight: int