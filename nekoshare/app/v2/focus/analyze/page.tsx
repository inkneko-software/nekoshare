'use client';
import { Alert, Box, Paper, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { FocusContext } from '@/app/v2/focus/context';

interface LimitUpReason {
    id: number;
    trade_date: string;
    stock_code: string;
    stock_name: string;
    limit_up_type: string;
    reason_type: string;
    change_rate: number;
    turnover_rate: number;
    high_days: string;
    first_limit_up_time: string;
    last_limit_up_time: string;
}

function formatTime(t: string) {
    // MySQL TIMESTAMP may include date prefix, extract HH:mm:ss only
    const parts = t.split(' ');
    return parts.length > 1 ? parts[1] : t;
}

const columns = [
    { id: 'index', label: '序号', width: 50 },
    { id: 'stock_code', label: '代码', width: 80 },
    { id: 'stock_name', label: '名称', width: 100 },
    { id: 'limit_up_type', label: '涨停板类型', width: 90 },
    { id: 'reason_type', label: '涨停原因', minWidth: 200 },
    { id: 'change_rate', label: '涨幅', width: 70 },
    { id: 'turnover_rate', label: '换手率', width: 70 },
    { id: 'high_days', label: '高度', width: 70 },
    { id: 'first_limit_up_time', label: '最早涨停', width: 90 },
    { id: 'last_limit_up_time', label: '最后涨停', width: 90 },
];

function AnalyzePage() {
    const { selectedTradeDate, setCopyTableData } = useContext(FocusContext);
    const [data, setData] = useState<LimitUpReason[]>([]);
    const [copySuccess, setCopySuccess] = useState(false);

    useEffect(() => {
        async function fetchData() {
            const dateStr = selectedTradeDate.format('YYYY-MM-DD');
            const res = await fetch(`/api/pysdk/focus/get_limit_up_reason?date=${dateStr}`);
            const json = await res.json();
            setData(json);
        }
        fetchData();
    }, [selectedTradeDate]);

    useEffect(() => {
        setCopyTableData?.(() => () => {
            const rows = data.map((row, index) => [
                String(index + 1),
                row.stock_code,
                row.stock_name,
                row.limit_up_type,
                row.reason_type,
                row.change_rate.toFixed(2) + '%',
                row.turnover_rate.toFixed(2) + '%',
                row.high_days,
                formatTime(row.first_limit_up_time),
                formatTime(row.last_limit_up_time),
            ]);
            const text = [['序号', '代码', '名称', '涨停板类型', '涨停原因', '涨幅', '换手率', '高度', '最早涨停', '最后涨停'], ...rows]
                .map(r => r.join('\t')).join('\n');
            navigator.clipboard.writeText(text).then(() => setCopySuccess(true));
        });
        return () => setCopyTableData?.(undefined);
    }, [data, setCopyTableData]);

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <Box sx={{ m: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2" color="text.secondary">
                    涨停家数: {data.length}
                </Typography>
            </Box>
            <TableContainer
                component={Paper}
                sx={{ flex: 1, overflow: 'auto' }}
            >
                <Table size="small" stickyHeader sx={{ tableLayout: 'fixed' }}>
                    <TableHead>
                        <TableRow>
                            {columns.map(col => (
                                <TableCell
                                    key={col.id}
                                    sx={{
                                        width: col.width,
                                        minWidth: col.minWidth,
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap',
                                    }}
                                >
                                    {col.label}
                                </TableCell>
                            ))}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((row, index) => (
                            <TableRow key={row.id} hover>
                                <TableCell>{index + 1}</TableCell>
                                <TableCell>{row.stock_code}</TableCell>
                                <TableCell>{row.stock_name}</TableCell>
                                <TableCell>{row.limit_up_type}</TableCell>
                                <TableCell
                                    sx={{
                                        whiteSpace: 'normal',
                                        wordBreak: 'break-word',
                                    }}
                                >
                                    {row.reason_type}
                                </TableCell>
                                <TableCell
                                    sx={{
                                        color: row.change_rate >= 0 ? '#e23f3f' : '#42be23',
                                    }}
                                >
                                    {row.change_rate.toFixed(2)}%
                                </TableCell>
                                <TableCell>{row.turnover_rate.toFixed(2)}%</TableCell>
                                <TableCell>{row.high_days}</TableCell>
                                <TableCell>{formatTime(row.first_limit_up_time)}</TableCell>
                                <TableCell>{formatTime(row.last_limit_up_time)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <Snackbar
                open={copySuccess}
                autoHideDuration={2000}
                onClose={() => setCopySuccess(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert
                    onClose={() => setCopySuccess(false)}
                    severity="success"
                    variant="filled"
                    sx={{ width: '100%', color: 'white' }}
                >
                    已复制到剪贴板
                </Alert>
            </Snackbar>
        </Box>
    );
}

export default AnalyzePage;
