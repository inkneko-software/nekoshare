/*
CREATE TABLE fetch_log(
    id BIGINT PRIMARY KEY AUTO_INCREMENT COMMENT '主键ID',
    job_type ENUM('ths_industry_quote', 'tdx_stocks_quote') NOT NULL COMMENT '任务类型，同花顺行业实时日线/通达信实时日线',
    job_status ENUM('success', 'failed') NOT NULL COMMENT '任务状态，成功为SUCCESS，失败为FAILED',
    msg TEXT NOT NULL COMMENT '日志信息',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;*/

export default interface FetchLog {
    id: number;
    job_type: string;
    job_status: string;
    msg: string;
    created_at: Date;
}