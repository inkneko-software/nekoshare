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


interface CommonPriceTableData {
    id: number,
    name: string;
    code: string;
    change_pct: number;
    price?: number
}

interface CommonPriceTableProps {
    enablePrice: boolean;
    columnNames: string[];
    columnWidths: string[];
    rows: CommonPriceTableData[];
    selectedId?: number;
    onSelectedChange?: (selectedId: number) => void;
}

export default function CommonPriceTable({ enablePrice, columnNames, columnWidths, rows, selectedId, onSelectedChange }: CommonPriceTableProps) {

    const handleClick = (event: React.MouseEvent<unknown>, id: number) => {
        if (selectedId === undefined){
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
            <TableContainer>
                <Table
                    aria-labelledby="tableTitle"
                    size='small'
                    sx={{ tableLayout: 'fixed' }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell
                                key="index"
                                align="right"
                                padding='normal'
                                width={columnWidths[0]}
                            >
                                {columnNames[0]}
                            </TableCell>
                            <TableCell
                                key="name"
                                align="left"
                                padding='normal'
                                width={columnWidths[1]}
                            >
                                {columnNames[1]}
                            </TableCell>
                            <TableCell
                                key="change_pct"
                                align="right"
                                padding='normal'
                                width={columnWidths[2]}
                            >
                                {columnNames[2]}
                            </TableCell>
                            {
                                enablePrice ? (
                                    <TableCell
                                        key="price"
                                        align="right"
                                        padding='normal'
                                        width={columnWidths[3]}
                                    >
                                        {columnNames[3]}
                                    </TableCell>
                                ) : null
                            }
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {rows.map((row, index) => {
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
                                        sx={{ width: columnWidths[0], borderLeft: isItemSelected ? '4px solid #1976d2' : '4px solid transparent' }}
                                        align="right"
                                    >
                                        {index}
                                    </TableCell>
                                    <TableCell sx={{ width: columnWidths[1], borderLeft: '1px  rgba(81, 81, 81, 1) solid' }}>
                                        <Typography variant="body2" noWrap>{row.name}</Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{
                                        width: columnWidths[2],
                                        color: (row.change_pct > 0 ? '#ff3535' : row.change_pct === 0 ? 'unset' : '#20cf17'),
                                        borderLeft: '1px rgba(81, 81, 81, 1) solid',
                                    }}
                                    >{row.change_pct.toFixed(2) + '%'
                                        }</TableCell>
                                    {
                                        enablePrice ? (
                                            <TableCell align="right" sx={{
                                                width: columnWidths[3],
                                                color: (row.change_pct > 0 ? '#ff3535' : row.change_pct === 0 ? 'unset' : '#20cf17'),
                                                borderLeft: '1px rgba(81, 81, 81, 1) solid',
                                            }}>{row.price?.toFixed(2)}</TableCell>
                                        ) : null
                                    }
                                </TableRow>
                            );
                        })}

                    </TableBody>
                </Table>
            </TableContainer>

        </Paper>
    );
}
