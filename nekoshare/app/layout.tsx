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
import { ThemeProvider } from '@mui/material/styles';
import theme from './theme';
import MainNavigationDrawer from "@/components/Drawer/MainNavigationDrawer";
import TradePanel from "@/components/TradePanel/TradePanel";
import { SimulateTradingContextProvider } from "@/lib/context/SimulateTradingContext";
import FetchStatus from "@/components/FetchStatus";

// const roboto = Roboto({
//     weight: ['300', '400', '500', '700'],
//     subsets: ['latin'],
//     display: 'swap',
//     variable: '--font-roboto',
// });

const roboto = localFont({
    src: "../public/font/roboto.woff2",
})

export const metadata: Metadata = {
    title: "NekoShare",
    description: "基于K线模型的量化分析平台",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {


    return (
        <html lang="en" className={roboto.className}>
            <Head>
                <meta name="viewport" content="minimum-scale=1, initial-scale=1, width=device-width" />
                <title>HeiMusic</title>
                <style>
                    {
                        `::-webkit-scrollbar {
                width: 12px;
                height: 8px;
                background-color: #e3e3e3; /* or add it to the track */
                border-radius: 4px;

              }
              ::-webkit-scrollbar-thumb {
                background: #aaa;
                border-radius: 4px;
              }
              ::-webkit-scrollbar-thumb:hover {
                background: #7c7c7c;
                border-radius: 4px;
              }
              ::-webkit-scrollbar-track {
              }
              
              @media(max-width: 600px) {
                ::-webkit-scrollbar {
                  width: 6px;
                  height: 8px;
                  background-color: #e3e3e3; /* or add it to the track */
                  border-radius: 4px;
  
                }
              }
              body, html {
                margin: 0;
                height: 100%;
              }
    
              body {
                display: flex;
                flex-direction: column;
              }

              #__next {
                margin: 0;
                height: 100%;
              }
              `
                    }

                </style>
            </Head>
            <body style={{ margin: '0px 0px' }} >
                <AppRouterCacheProvider>
                    <ThemeProvider theme={theme}>
                        <SimulateTradingContextProvider>
                            <AppBar position="fixed" sx={{ zIndex: 65535 }}>
                                <Toolbar>
                                    <IconButton
                                        size="large"
                                        edge="start"
                                        color="inherit"
                                        aria-label="menu"
                                        sx={{ mr: 2 }}
                                    >
                                        <MenuIcon />
                                    </IconButton>
                                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                                        NekoShare - 量化回测
                                    </Typography>
                                    <FetchStatus />
                                    <Timer />
                                    <Button color="inherit" href="/">集合竞价</Button>
                                    <Button color="inherit" href="/backtrace">数据回测</Button>
                                </Toolbar>
                            </AppBar>
                            {/* <ScrollToTopButton /> */}
                            <Toolbar />
                            <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)' }}>

                                <MainNavigationDrawer />

                                {children}
                            </Box>
                            <TradePanel />
                        </SimulateTradingContextProvider>
                    </ThemeProvider>
                </AppRouterCacheProvider>
            </body>
        </html>
    );
}
