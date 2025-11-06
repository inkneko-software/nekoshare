import * as React from 'react';
import { alpha } from '@mui/material/styles';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import FormControlLabel from '@mui/material/FormControlLabel';
import Switch from '@mui/material/Switch';
import DeleteIcon from '@mui/icons-material/Delete';
import FilterListIcon from '@mui/icons-material/FilterList';
import { visuallyHidden } from '@mui/utils';
import { TradeHistory } from '@/lib/context/SimulateTradingContext';


const customizedHiddenScrollBarStyle = {
    '::-webkit-scrollbar': {
        width: '6px',
        height: ' 8px',
        backgroundColor: 'rgba(0,0,0,0)', /* or add it to the track */
        borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb': {
        background: 'rgba(0,0,0,0)',
        borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb:hover': {
        background: 'rgba(0,0,0,0)',
        borderRadius: '4px',
    },
    '::-webkit-scrollbar-track': {

    }
}
const customizedScrollBarStyle = {
    '::-webkit-scrollbar': {
        width: '6px',
        height: ' 8px',
        backgroundColor: '#171b2e', /* or add it to the track */
        borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb': {
        background: '#232947',
        borderRadius: '4px',
    },
    '::-webkit-scrollbar-thumb:hover': {
        background: '#293053',
        borderRadius: '4px',
    },
    '::-webkit-scrollbar-track': {

    }
}


interface TradeHistoryTableData {
    id: number,
    name: string;
    code: string;
    change_pct: number;
    price?: number
}

interface TradeHistoryTableProps {
    rows: TradeHistory[];
    selectedId?: number;
    onSelectedChange?: (selectedId: number) => void;
}

export default function TradeHistoryTable({ rows, selectedId, onSelectedChange }: TradeHistoryTableProps) {

    const handleClick = (event: React.MouseEvent<unknown>, id: number) => {
        if (selectedId === undefined) {
            return;
        }

        const newSelected = selectedId === id ? -1 : id;
        if (onSelectedChange) {
            onSelectedChange(newSelected);
        }
        return newSelected;
    };

    return (
        <Paper sx={{ height: '100%', width: '100%', overflow: 'auto', ...customizedHiddenScrollBarStyle, ':hover': { ...customizedScrollBarStyle } }} square>
            <TableContainer sx={{ width: '100%' }}>
                <Table
                    aria-labelledby="tableTitle"
                    size='small'
                    sx={{ tableLayout: 'fixed', width: '100%' }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell
                                key="name"
                                align="left"
                                padding='normal'
                                width='16%'
                            >
                                名称
                            </TableCell>
                            <TableCell
                                key="action"
                                align="left"
                                padding='normal'
                                width='16%'
                            >
                                操作
                            </TableCell>
                            <TableCell
                                key="price"
                                align="left"
                                padding='normal'
                                width='16%%'
                            >
                                价格
                            </TableCell>
                            <TableCell
                                key="quantity"
                                align="left"
                                padding='normal'
                                width='16%'
                            >
                                数量
                            </TableCell>

                            <TableCell
                                key="date"
                                align="left"
                                padding='normal'
                                width='16%%'
                            >
                                日期
                            </TableCell>
                            <TableCell
                                key="profit"
                                align="left"
                                padding='normal'
                                width='16%'
                            >
                                清仓盈亏
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => {
                            const isItemSelected = selectedId === index;
                            const labelId = `enhanced-table-checkbox-${index}`;

                            return (
                                <TableRow
                                    hover
                                    onClick={(event) => handleClick(event, index)}
                                    role="checkbox"
                                    aria-checked={isItemSelected}
                                    tabIndex={-1}
                                    key={index}
                                    selected={isItemSelected}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <TableCell
                                        component="th"
                                        id={labelId}
                                        scope="row"
                                        sx={{ width: '16%', borderLeft: isItemSelected ? '4px solid #1976d2' : '4px solid transparent' }}
                                        align="left"
                                    >
                                        {row.name}
                                    </TableCell>
                                    <TableCell
                                        component="th"
                                        id={labelId}
                                        scope="row"
                                        sx={{ width: '16%', color: row.type === 'buy' ? 'green' : 'red' }}
                                        align="left"
                                    >
                                        {
                                            row.type === 'buy' ? '买入' : '卖出'
                                        }
                                    </TableCell>
                                    <TableCell
                                        component="th"
                                        id={labelId}
                                        scope="row"
                                        sx={{ width: '16%' }}
                                        align="left"
                                    >
                                        {row.price}
                                    </TableCell>
                                    <TableCell
                                        component="th"
                                        id={labelId}
                                        scope="row"
                                        sx={{ width: '16%' }}
                                        align="left"
                                    >
                                        {row.quantity}
                                    </TableCell>
                                    <TableCell
                                        component="th"
                                        id={labelId}
                                        scope="row"
                                        sx={{ width: '16%' }}
                                        align="left"
                                    >
                                        {row.tradeDate}
                                    </TableCell>
                                    <TableCell
                                        component="th"
                                        id={labelId}
                                        scope="row"
                                        sx={{ width: '16%' }}
                                        align="left"
                                    >
                                        {row.profit}
                                    </TableCell>
                                </TableRow>
                            );
                        })}



                    </TableBody>
                </Table>
            </TableContainer>
            {
                rows.length === 0 && (
                    <Typography
                        sx={{ textAlign: 'center', width: '100%', margin: '30% auto' }}
                    >
                        暂无数据
                    </Typography>
                )
            }
        </Paper>
    );
}
