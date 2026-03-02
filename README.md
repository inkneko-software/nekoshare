nekoshare 基于K线形态的股票分析系统
---

本系统的目标是选择符合特定K线形态的股票，并将其进行可视化展示，供使用者进行参考决策

### 部署说明

程序分为前后端，前端为Next.js，后端为Python，数据通过MySQL存储

项目使用Docker部署，共有三个Dockerfile文件，分别对应三个服务

- 前端Next.js服务：nekoshare/Dockerfile

- 后端fastapi实现的数据接口服务 research/Dockerfile.api

- 爬虫任务服务research/Dockerfile.fetch


通过根目录下的docker-compose.yml启动，配置通过环境变量传递，参考.env.development文件

### 数据

> 已更换为闭源的nekoshare-data，以下数据获取方式将不再维护

数据分别为：

1.通达信提供的`非复权沪深京股票日线数据`

```
data/download.sh下载日线数据包

data/load.py将日线数据表导入到mysql
```

2.tushare提供的`复权因子`

research/group_breakout/fetch.py中，函数`fetch_all_qfq_and_save`

3.同花顺网页端提供的`行业板块日线数据`

research/group_breakout/fetch.py中，函数`fetch_and_save`

