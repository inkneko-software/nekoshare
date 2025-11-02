'use client'
import { Paper, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField } from "@mui/material";
import type { Metadata } from "next";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { AppBar, Box, Button, IconButton, Toolbar, Typography, Fab } from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardDoubleArrowUpOutlinedIcon from '@mui/icons-material/KeyboardDoubleArrowUpOutlined';
import ScrollToTopButton from "@/components/ScrollToTopButton";
import Timer from "@/components/Timer";
import Head from 'next/head';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import localFont from 'next/font/local';
import { ThemeProvider, useTheme } from '@mui/material/styles';
import FullscreenExitOutlinedIcon from '@mui/icons-material/FullscreenExitOutlined';
import FullscreenOutlinedIcon from '@mui/icons-material/FullscreenOutlined';
import MainNavigationDrawer from "@/components/Drawer/MainNavigationDrawer";
import React from "react";

export default function TradePanel() {
    const theme = useTheme();
    const [expand, setExpand] = React.useState(false);
    const [tabIndex, setTabIndex] = React.useState(2);
    function a11yProps(index: number) {
        return {
            id: `simple-tab-${index}`,
            'aria-controls': `simple-tabpanel-${index}`,
        };
    }

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    };

    return (
        <Paper sx={[{ overflow: 'hidden', display:'flex', flexDirection: 'column', zIndex: '65535', borderRadius: '8px', width: '128px', height: '32px', position: 'absolute', bottom: 16, right: 16, transition: 'all 0.3s ease-in-out' }, expand && { width: '20%', height: '50%', background: '#303030' }]}>
            {
                !expand && <Button sx={{ backgroundColor: '#25509f', color: 'white', width: '128px', height: '32px', position: 'relative', bottom: 0, right: 0 }} onClick={() => setExpand(true)}>
                    <HistoryOutlinedIcon sx={{ mr: 1 }} />
                    2025-01-01
                </Button>
            }
            {
                expand && (
                    <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', backgroundColor: '#222222', color: 'white' }}>
                            <Typography variant="h6" component="div" sx={{ flexGrow: 1, margin: ' 8px 8px' }}>
                                模拟交易 2025-01-01 收盘前
                            </Typography>
                            <IconButton
                                size="small"
                                edge="start"
                                color="inherit"
                                aria-label="menu"
                                sx={{ margin: '0px 8px 0px auto' }}
                                onClick={() => setExpand(false)}
                            >
                                <FullscreenExitOutlinedIcon />
                            </IconButton>
                        </Box>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                            <Tabs value={tabIndex} onChange={handleChange} aria-label="basic tabs example" variant="fullWidth">
                                <Tab label="买入" {...a11yProps(0)} />
                                <Tab label="卖出" {...a11yProps(1)} />
                                <Tab label="账户" {...a11yProps(2)} />
                            </Tabs>
                        </Box>
                        {
                            tabIndex === 0 && (
                                <Box sx={{ display: 'flex', margin: ' 8px 8px' }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '50%' }}>
                                        <TextField size='small' label='股票代码' defaultValue="600286" sx={{ margin: '8px 8px' }} />
                                        <TextField size='small' label='买入数量' defaultValue="200" sx={{ margin: '8px 8px' }} />
                                        <TextField size='small' label='买入价格' defaultValue="10.21" disabled sx={{ margin: '8px 8px' }} />
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '50%' }}>
                                        <Typography variant="body2" sx={{ margin: '8px 8px' }}>可用 68286.00</Typography>
                                        <Typography variant="body2" sx={{ margin: '8px 8px' }}>可买 200</Typography>
                                        <Typography variant="body2" sx={{ margin: '8px 8px' }}>买入市值 2023.32</Typography>
                                        <Button variant="contained" sx={{ margin: '8px 8px', marginTop: 'auto', 'backgroundColor': '#ff2e2e', color: 'white' }} size="small">买入</Button>
                                    </Box>

                                </Box>
                            )

                        }
                        {
                            tabIndex === 1 && (
                                <Box sx={{ display: 'flex', margin: ' 8px 8px' }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '50%' }}>
                                        <TextField size='small' label='股票代码' defaultValue="600286" sx={{ margin: '8px 8px' }} />
                                        <TextField size='small' label='卖出数量' defaultValue="200" sx={{ margin: '8px 8px' }} />
                                        <TextField size='small' label='卖出价格' defaultValue="10.21" disabled sx={{ margin: '8px 8px' }} />
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', width: '50%' }}>
                                        <Typography variant="body2" sx={{ margin: '8px 8px' }}>可用 68286.00</Typography>
                                        <Typography variant="body2" sx={{ margin: '8px 8px' }}>可卖 200</Typography>
                                        <Typography variant="body2" sx={{ margin: '8px 8px' }}>卖出市值 2023.32</Typography>
                                        <Button variant="contained" sx={{ margin: '8px 8px', marginTop: 'auto', 'backgroundColor': '#035f3c', color: 'white' }} size="small">卖出</Button>
                                    </Box>

                                </Box>
                            )
                        }
                        {
                            tabIndex === 2 && (
                                <Box sx={{ display: 'flex', flexDirection: 'column', margin: ' 8px 8px', paddingLeft: '24px' }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                        <Box sx={{ width: '33%', display: 'flex', flexDirection: 'column', }}>
                                            <Typography>总资产</Typography>
                                            <Typography variant='body2' fontWeight={'bold'} sx={{}}>100000.00</Typography>
                                        </Box>
                                        <Box sx={{ width: '33%', display: 'flex', flexDirection: 'column', }}>
                                            <Typography>浮动盈亏</Typography>
                                            <Typography variant='body2' fontWeight={'bold'}>+500.00</Typography>
                                        </Box>
                                        <Box sx={{ width: '33%', display: 'flex', flexDirection: 'column', }}>
                                            <Typography>当日盈亏</Typography>
                                            <Typography variant='body2' fontWeight={'bold'}>+600.00 1.28%</Typography>
                                        </Box>
                                    </Box>
                                    <Box sx={{ display: 'flex', marginTop: '8px', justifyContent: 'center' }}>
                                        <Box sx={{ width: '33%', display: 'flex', flexDirection: 'column' }}>
                                            <Typography>总市值</Typography>
                                            <Typography variant='body2' fontWeight={'bold'}>100000.00</Typography>
                                        </Box>
                                        <Box sx={{ width: '33%', display: 'flex', flexDirection: 'column' }}>
                                            <Typography>可用</Typography>
                                            <Typography variant='body2' fontWeight={'bold'}>100000.00</Typography>
                                        </Box>
                                        <Box sx={{ width: '33%', display: 'flex', flexDirection: 'column' }}>
                                        <Typography variant='button' sx={{ color: '#2587e4', cursor: 'pointer' }} onClick={() => { }}>{"下一日>"}</Typography>

                                            <Typography variant='button' sx={{ color: '#2587e4', cursor: 'pointer' }} onClick={() => { }}>{"查看BS点>"}</Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            )
                        }

                    </Box>

                )
            }
            {
                expand && (
                    <TableContainer sx={{ overflow: 'auto' }}>
                        <Table size='small' sx={{ tableLayout: 'fixed'}}>
                            <TableHead>
                                <TableRow>

                                    <TableCell>市值</TableCell>
                                    <TableCell>盈亏</TableCell>
                                    <TableCell>持仓/可用</TableCell>
                                    <TableCell>成本/现价</TableCell>
                                </TableRow>
                                
                            </TableHead>
                            <TableBody> 
                                    {
                                        [1,3,3,1,2].map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    <Typography variant='body2'>国电南自</Typography>
                                                    <Typography variant='body2'>2012.26</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant='body2'>+500.00</Typography>
                                                    <Typography variant='body2'>+0.26%</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant='body2'>200</Typography>
                                                    <Typography variant='body2'>0</Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant='body2'>10.06</Typography>
                                                    <Typography variant='body2'>9.26</Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))  
                                    }
                                </TableBody>
                        </Table>
                    </TableContainer>


                )
            }

        </Paper>
    );
}