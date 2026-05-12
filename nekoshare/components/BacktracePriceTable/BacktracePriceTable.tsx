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
import { Head } from 'next/document';


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


interface HeadCell {
    name: '' | '名称' | '涨幅(%)' | '次日' | '三日' | '五日';
    width: string;
    position: 'left' | 'right'
}


interface BackTracePriceTableData {
    id: number,
    name: string;
    code: string;
    change_pct: number;
    afterDay: number;
    threeDay: number;
    fiveDay: number;
}

interface BackTracePriceTableProps {
    rows: BackTracePriceTableData[];
    selectedId?: number;
    onSelectedChange?: (selectedId: number) => void;
    fullHeight?: boolean;
}

export default function BackTracePriceTable({ rows, selectedId, onSelectedChange, fullHeight }: BackTracePriceTableProps) {

    const [order, setOrder] = React.useState<'asc' | 'desc'>('asc');
    const [orderBy, setOrderBy] = React.useState<'' | '名称' | '涨幅(%)' | '次日' | '三日' | '五日'>('');
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

    // const columnNames = ['', '名称', '涨幅(%)', '次日', '三日', '五日']
    // const columnWidths = ['10%', '30%', '15%', '15%', '15%', '15%']

    const columns: HeadCell[] = [
        { name: '', width: '10%', position: 'right' },
        { name: '名称', width: '30%', position: 'left' },
        { name: '涨幅(%)', width: '15%', position: 'right' },
        { name: '次日', width: '15%', position: 'right' },
        { name: '三日', width: '15%', position: 'right' },
        { name: '五日', width: '15%', position: 'right' },
    ]

    const visiableRows = React.useMemo(() => {
        if (orderBy === '' || orderBy === '名称') {
            return rows;
        }
        return rows.slice().sort((a, b) => {
            if (order === 'asc') {
                if (orderBy === '涨幅(%)') {
                    return a.change_pct - b.change_pct;
                } else if (orderBy === '次日') {
                    return a.afterDay - b.afterDay;
                } else if (orderBy === '三日') {
                    return a.threeDay - b.threeDay;
                } else {
                    return a.fiveDay - b.fiveDay;
                }
            } else {
                if (orderBy === '涨幅(%)') {
                    return b.change_pct - a.change_pct;
                } else if (orderBy === '次日') {
                    return b.afterDay - a.afterDay;
                } else if (orderBy === '三日') {
                    return b.threeDay - a.threeDay;
                } else {
                    return b.fiveDay - a.fiveDay;
                }
            }
        })
    }, [rows, order, orderBy]);

    const handleRequestSort = (
        event: React.MouseEvent<unknown>,
        property: '' | '名称' | '涨幅(%)' | '次日' | '三日' | '五日',
    ) => {
        if (property === '' || property === '名称') {
            return;
        }
        if (orderBy === property && order === 'desc') {
            setOrder('asc');
            setOrderBy('');
            return;
        }
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };



    return (
        <Paper sx={[{ width: '100%', ...customizedHiddenScrollBarStyle, ':hover': { ...customizedScrollBarStyle } }, !fullHeight && { height: '100%', overflow: 'auto', }]} square>
            <TableContainer>
                <Table
                    aria-labelledby="tableTitle"
                    size='small'
                    sx={{ tableLayout: 'fixed' }}
                >
                    <TableHead>
                        <TableRow>
                            {
                                columns.map((column, index) => (
                                    <TableCell
                                        key={column.name}
                                        align={column.position}
                                        width={column.width}
                                        sortDirection={orderBy === column.name ? order : false}
                                        sx={{ padding: '6px 16px', whiteSpace: 'nowrap' }}

                                    >
                                        {
                                            column.name !== '' && column.name !== '名称' && (
                                                <TableSortLabel
                                                    active={orderBy === column.name}
                                                    direction={orderBy === column.name ? order : 'asc'}
                                                    onClick={(event) => handleRequestSort(event, column.name)}
                                                />
                                            )
                                        }

                                        {column.name}
                                    </TableCell>
                                ))
                            }
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {visiableRows.map((row, index) => {
                            const isItemSelected = selectedId === row.id;
                            const labelId = `enhanced-table-checkbox-${index}`;

                            return (
                                <TableRow
                                    hover
                                    onClick={(event) => handleClick(event, row.id)}
                                    role="checkbox"
                                    aria-checked={isItemSelected}
                                    tabIndex={-1}
                                    key={row.id}
                                    selected={isItemSelected}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <TableCell
                                        component="th"
                                        id={labelId}
                                        scope="row"
                                        sx={{ width: columns[0].width, borderLeft: isItemSelected ? '4px solid #1976d2' : '4px solid transparent' }}
                                        align="right"
                                    >
                                        {index}
                                    </TableCell>
                                    <TableCell sx={{ width: columns[1].width, borderLeft: '1px  rgba(81, 81, 81, 1) solid' }}>
                                        <Typography variant="body2" noWrap>{row.name}</Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{
                                        width: columns[2].width,
                                        color: (row.change_pct > 0 ? '#ff3535' : row.change_pct === 0 ? 'unset' : '#20cf17'),
                                        borderLeft: '1px rgba(81, 81, 81, 1) solid',
                                    }}
                                    >
                                        {row.change_pct.toFixed(2) + '%'}
                                    </TableCell>

                                    <TableCell align="right" sx={{
                                        width: columns[3].width,
                                        color: (row.afterDay > 0 ? '#ff3535' : row.afterDay === 0 ? 'unset' : '#20cf17'),
                                        borderLeft: '1px rgba(81, 81, 81, 1) solid',
                                    }}>
                                        {row.afterDay.toFixed(2) + '%'}
                                    </TableCell>

                                    <TableCell align="right" sx={{
                                        width: columns[4].width,
                                        color: (row.threeDay > 0 ? '#ff3535' : row.threeDay === 0 ? 'unset' : '#20cf17'),
                                        borderLeft: '1px rgba(81, 81, 81, 1) solid',
                                    }}>{row.threeDay.toFixed(2) + '%'}</TableCell>


                                    <TableCell align="right" sx={{
                                        width: columns[5].width,
                                        color: (row.fiveDay > 0 ? '#ff3535' : row.fiveDay === 0 ? 'unset' : '#20cf17'),
                                        borderLeft: '1px rgba(81, 81, 81, 1) solid',
                                    }}>{row.fiveDay.toFixed(2) + '%'}</TableCell>

                                </TableRow>
                            );
                        })}

                    </TableBody>
                </Table>
            </TableContainer>

        </Paper>
    );
}
