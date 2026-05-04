'use client'
import { Box, Button, Typography } from '@mui/material';
import ReactECharts from "echarts-for-react";
import { EChartsOption } from 'echarts/types/dist/shared';
import { TreemapSeriesNodeItemOption } from 'echarts/types/src/chart/treemap/TreemapSeries.js';
import { useContext, useEffect, useState } from 'react';
import { useTheme } from '@mui/material';
import HotMoneyTransactionTable, { HotMoneyTransaction, Transaction } from '@/components/HotMoneyTransactionTable';
import { FocusContext } from '../layout';

interface ConceptTreemapNode {
    name: string;
    value: number;
    items: TransactionItem[];
}

function ConceptHeatmap({ res }: { res: any }) {
    const [data, setData] = useState<TreemapSeriesNodeItemOption[]>([]);
    useEffect(() => {
        async function fetchExampleData() {
            if (res === null) {
                return;
            }

            res = res.data
            let tmp = [];
            let map = new Map();
            for (let i = 0; i < res.items.length; i++) {
                let item = res.items[i];
                if (item.range_days !== 1) {
                    continue;
                }
                if (item.change < 0) {
                    continue;
                }
                for (let concept of item.concept_list) {
                    if (!map.has(concept.name)) {
                        map.set(concept.name, { times: 0, items: [] });
                    }
                    let val = map.get(concept.name);
                    val.times += 1;
                    val.items.push(item);
                    map.set(concept.name, val);
                }
            }
            for (let [key, value] of map) {

                tmp.push({
                    name: key,
                    value: value.times,
                    items: value.items,
                    itemStyle: { color: "#1e52a1" }
                });
            }
            setData(tmp);
        }

        fetchExampleData();
    }, [res])
    const option: EChartsOption = {
        backgroundColor: '#121212',
        tooltip: {
            renderMode: "richText",
            formatter: (info) => {
                if (info instanceof Array) {
                    return '';
                }
                let data = info.data as ConceptTreemapNode;
                let conceptStocks = "";
                console.log()
                if (!data.items) {
                    return '';
                }
                for (let item of data.items) {
                    conceptStocks += `${item.stock_name}: ${item.concept_list.map(item => item.name).join('、')}\n`;
                }
                return `${info.name}\n出现次数: ${info.value}\n${conceptStocks}`;
            }
        },
        series: [
            {
                type: "treemap",
                data: data,
                roam: false,
                nodeClick: false,
                label: {
                    show: true,
                    formatter: "{b}"
                },
                breadcrumb: {
                    show: false
                },
                left: 8,
                right: 0,
                top: 8,
                bottom: 8
            }
        ]
    };

    return <ReactECharts option={option} style={{ width: '100%', height: '100%', flexGrow: 1 }} />;
}

interface TransactionItem {
    stock_name: string;
    amount: number;
    change: number;
    limit_reason: string;
    concept_list: { name: string, code: string }[];
}

interface TransactionTreemapNode {
    name: string;
    value: number;
    item: TransactionItem;
}
function TransactionHeatmap({ res }: { res: any }) {
    const [data, setData] = useState<TreemapSeriesNodeItemOption[]>([]);
    useEffect(() => {
        async function fetchExampleData() {
            if (res === null) {
                return;
            }
            console.log(res)
            res = res.data
            let tmp = [];

            for (let i = 0; i < res.items.length; i++) {
                let item = res.items[i];
                if (item.range_days !== 1) {
                    continue;
                }
                tmp.push({
                    name: item.stock_name,
                    value: item.amount,
                    item: item,
                    itemStyle: { color: item.change > 0 ? "#1e52a1" : "#2c8852" }
                });
            }


            setData(tmp);
        }

        fetchExampleData();

    }, [res])

    const option: EChartsOption = {
        backgroundColor: '#121212',
        tooltip: {
            renderMode: "richText",
            formatter: (info) => {
                if (info instanceof Array) {
                    return '';
                }
                if (typeof info.value !== 'number') {
                    return '';
                }
                const data = info.data as TransactionTreemapNode;
                return `${info.name}\n量: ${info.value >= 100000000 ? (info.value / 100000000).toFixed(2) + '亿' : (info.value / 10000).toFixed(2) + '万'}\n涨停原因：${data.item.limit_reason}\n所属概念：${data.item.concept_list.map(item => item.name).join('、')}`;
            }
        },
        series: [
            {
                type: "treemap",
                data: data,
                roam: false,
                nodeClick: false,
                label: {
                    show: true,
                    formatter: "{b}"
                },
                breadcrumb: {
                    show: false
                },
                left: 8,
                right: 0,
                top: 8,
                bottom: 8
            }
        ]
    };

    return <ReactECharts option={option} style={{ width: '100%', height: '100%', flexGrow: 1 }} />;
}


function HotPage() {
    const focusContext = useContext(FocusContext)
    const [exampleData, setExampleData] = useState<any>(null);

    const [hotMoneyBuyList, setHotMoneyBuyList] = useState<any>([]);
    const [hotMoneySellList, setHotMoneySellList] = useState<any>([]);
    const [selectedTransactionType, setSelectedTransactionType] = useState<'buy' | 'sell'>('buy');
    useEffect(() => {
        async function fetchExampleData() {
            let res = await (await fetch("/api/pysdk/focus/get_transaction?date=" + focusContext.selectedTradeDate.format('YYYY-MM-DD'))).json();
            setExampleData(res);
        }

        async function fetchHotMoneyList() {
            let res = await (await fetch("/api/pysdk/focus/get_hot_money_transaction?date=" + focusContext.selectedTradeDate.format('YYYY-MM-DD'))).json();

            setHotMoneyBuyList(res.one_day_net_buy)
            setHotMoneySellList(res.one_day_net_sell)
        }

        fetchHotMoneyList();
        fetchExampleData();

    }, [focusContext.selectedTradeDate])
    const handleTransactionTypeChange = () => {

        setSelectedTransactionType(prev => prev === 'buy' ? 'sell' : 'buy');
    };

    return (
        <Box sx={{ display: 'flex', width: '100%', height: '100%', minHeight: 0, }}>
            <Box sx={{ minHeight: 0, width: '50%', height: '100%', maxHeight: '100%', borderRight: '1px solid #e0e0e0', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                <Button sx={{ position: 'absolute', right: 0, zIndex: '100000' }} onClick={handleTransactionTypeChange}>
                    切换
                </Button>
                <HotMoneyTransactionTable hotMoneyList={selectedTransactionType === 'buy' ? hotMoneyBuyList : hotMoneySellList} transactionType={selectedTransactionType} />

            </Box>
            <Box sx={{ width: '50%', height: '100%', display: 'flex', flexDirection: 'column' }}>

                <Box sx={{ flex: 1, height: '50%', borderBottom: '1px solid #e0e0e0', display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="caption" sx={{ margin: '8px' }}>
                        概念频次热力图
                    </Typography>
                    <ConceptHeatmap res={exampleData} />
                </Box>
                <Box sx={{ flex: 1, height: '50%', display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="caption" sx={{ margin: '8px' }}>
                        龙虎榜交易额热力图
                    </Typography>
                    <TransactionHeatmap res={exampleData} />
                </Box>
            </Box>
        </Box>
    );
}

export default HotPage;