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
import { useEffect, useState } from 'react';
import React from 'react';


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

export interface Transaction {
  stock_name: string,
  value: number
}

export interface HotMoneyTransaction {
  name: string,
  transactions: Transaction[]

}
export default function HotMoneyTransactionTable({ hotMoneyList, transactionType }: { hotMoneyList: HotMoneyTransaction[], transactionType: 'buy' | 'sell', }) {

  function chunck(arr: Transaction[], size: number): Transaction[][] {
    let result = []
    for (let i = 0; i < arr.length; i += size) {
      result.push(arr.slice(i, i + size));
    }
    return result
  }

  function formatValue(value: number) {
    if (value > 100000000) {
      return (value / 100000000).toFixed(2) + '亿'
    } else if (value > 10000) {
      return (value / 10000).toFixed(0) + '万'
    } else {
      return value.toFixed(2)
    }
  }


  return (
    <Paper sx={{ height: '100%', width: '100%', maxHeight: '100%', maxWidth: '100%', overflow: 'auto' }} square>
      <TableContainer sx={{ height: '100%', width: '100%', ...customizedHiddenScrollBarStyle, ':hover': { ...customizedScrollBarStyle } }}>
        <Table
          aria-labelledby="tableTitle"
          size='small'
          sx={{ tableLayout: 'fixed', width: '100%' }}
          stickyHeader
        >
          <TableHead>
            <TableRow>
              <TableCell
                key="name"
                align="left"
                padding='normal'
                width='25%'
              >
                游资席位
              </TableCell>
              {
                [1, 2, 3].map((index) => (
                  <TableCell
                    key={`value_${index}`}
                    align="left"
                    padding='normal'
                    width='25%'
                  >
                    {transactionType === 'buy' ? '净买入' : '净卖出'}
                  </TableCell>
                ))
              }
            </TableRow>
          </TableHead>

          <TableBody>
            {
              hotMoneyList.map((hotMoney) => {
                let chunked = chunck(hotMoney.transactions, 3)
                return (
                  <React.Fragment key={hotMoney.name}>
                    <TableRow
                      key={`${hotMoney.name}_${0}`}
                    >
                      <TableCell
                        align="left"
                        padding='normal'
                        width='25%'
                        rowSpan={chunked.length}
                      >
                        {hotMoney.name}
                      </TableCell>
                      {
                        chunked[0].map((transaction, index) => (
                          <TableCell
                            key={`${hotMoney.name}_${0}_${index}_value`}
                            align="left"
                            padding='normal'
                            width='25%'
                            sx={{ borderLeft: '1px solid rgba(255,255,255,0.1)', color: transaction.value > 10000000 ? transactionType === 'buy' ? '#e23f3f' : '#42be23' : 'unset' }}
                          >
                            {transaction.stock_name + ' ' + formatValue(transaction.value)}
                          </TableCell>
                        ))
                      }
                      {/* 补齐空格，保证每行都是3列 */}
                      {Array.from({ length: 3 - chunked[0].length }).map((_, i) => (
                        <TableCell
                          key={`${hotMoney.name}_${0}_${chunked[0].length + i}_value`}
                          align="left"
                          padding='normal'
                          width='25%'
                          sx={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}
                        >
                        </TableCell>
                      ))}
                    </TableRow>
                    {
                      chunked.slice(1).map((chunk, row_index) => (
                        <TableRow
                          key={`${hotMoney.name}_${row_index + 1}`}
                        >
                          {/* <TableCell
                                                        align="left"
                                                        padding='normal'
                                                        width='25%'
                                                    >
                                                    </TableCell> */}
                          {
                            chunk.map((transaction, index) => (
                              <TableCell
                                key={`${hotMoney.name}_${row_index + 1}_${index}_value`}
                                align="left"
                                padding='normal'
                                width='25%'
                                sx={{ borderLeft: '1px solid rgba(255,255,255,0.1)', color: transaction.value > 10000000 ? transactionType === 'buy' ? '#e23f3f' : '#42be23' : 'unset' }}
                              >
                                {transaction.stock_name + ' ' + formatValue(transaction.value)}
                              </TableCell>
                            ))
                          }
                          {Array.from({ length: 3 - chunk.length }).map((_, i) => (
                            <TableCell
                              key={`${hotMoney.name}_${row_index + 1}_${chunk.length + i}_value`}
                              align="left"
                              padding='normal'
                              width='25%'
                              sx={{ borderLeft: '1px solid rgba(255,255,255,0.1)' }}
                            >
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    }
                  </React.Fragment>
                )
              })
            }
          </TableBody>
        </Table>
      </TableContainer>

    </Paper>
  );
}
