import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppBar, Button, IconButton, Toolbar, Typography } from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import KeyboardDoubleArrowUpOutlinedIcon from '@mui/icons-material/KeyboardDoubleArrowUpOutlined';
import ScrollToTopButton from "@/components/ScrollToTopButton";
import Timer from "@/components/Timer";
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
        <html lang="en">
            <body >
                <AppBar position="fixed">
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
                            NekoShare
                        </Typography>
                        <Timer/>
                        <Button color="inherit" href="/">集合竞价</Button>
                        <Button color="inherit" href="/backtrace">数据回测</Button>
                    </Toolbar>
                </AppBar>
                <ScrollToTopButton />
                <Toolbar/>
                
                {children}
            </body>
        </html>
    );
}
