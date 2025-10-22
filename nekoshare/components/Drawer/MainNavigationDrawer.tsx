'use client'
import * as React from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import Button from '@mui/material/Button';
import List from '@mui/material/List';
import Divider from '@mui/material/Divider';
import ListItem from '@mui/material/ListItem';
import ListItemButton, { ListItemButtonProps } from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import InboxIcon from '@mui/icons-material/MoveToInbox';
import MailIcon from '@mui/icons-material/Mail';
import { styled, Toolbar, useTheme } from '@mui/material';
import ShowChartOutlinedIcon from '@mui/icons-material/ShowChartOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import ManageSearchOutlinedIcon from '@mui/icons-material/ManageSearchOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import LocalAtmOutlinedIcon from '@mui/icons-material/LocalAtmOutlined';
import SettingsSuggestOutlinedIcon from '@mui/icons-material/SettingsSuggestOutlined';
import { usePathname } from 'next/navigation'
import darkTheme from '@/app/theme';
import Link from 'next/link';

export const StyledListItemButton = styled(ListItemButton)<ListItemButtonProps>({
  borderRadius: "6px",
  paddingTop: "0px",
  paddingBottom: "0px",
  marginBottom: "12px",
  ":hover": {
    backgroundColor: "#263551",
    color: "#ffffff",
    "& .MuiListItemIcon-root": {
      color: "#ffffff",
    },
  },
  "&.Mui-selected": {
    backgroundColor: "#25509f",
    color: "#ffffff",
    "& .MuiListItemIcon-root": {
      color: "#ffffff",
    },
    ":hover": {
      backgroundColor: "#25509f",
      color: "#ffffff",
    }
  },
})

export default function MainNavigationDrawer() {
  const pathName = usePathname();
  const theme = useTheme()
  const [open, setOpen] = React.useState(true);

  const toggleDrawer = (newOpen: boolean) => () => {
    setOpen(newOpen);
  };

  const navigationList = [
    { text: '行情', icon: <ShowChartOutlinedIcon />, href: '/v2' },
    { text: '自选', icon: <Inventory2OutlinedIcon />, href: '/v2/favorites' },
    { text: '策略执行', icon: <ManageSearchOutlinedIcon />, href: '/v2/strategy-execution' },
    { text: '策略回测', icon: <HistoryOutlinedIcon />, href: '/v2/strategy-backtrace' },
    { text: '模拟交易', icon: <LocalAtmOutlinedIcon />, href: '/v2/trading' },
  ]
  const DrawerList = (
    <Box sx={{ width: 250 }} role="presentation" onClick={toggleDrawer(false)}>
      <List>
        {navigationList.map((nav, index) => (
          <ListItem key={nav.text} disablePadding >
            <Link href={nav.href} style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}>
              <StyledListItemButton sx={{ padding: '0px 0px', margin: '8px 24px' }} selected={pathName === nav.href}>
                <ListItemIcon sx={{marginLeft: '8px'}}>
                  {nav.icon}
                </ListItemIcon>
                <ListItemText primary={nav.text} />
              </StyledListItemButton>
            </Link >
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        {['系统状态'].map((text, index) => (
          <ListItem key={text} disablePadding>
            <Link href="/v2/system-status" style={{ textDecoration: 'none', color: 'inherit', width: '100%' }}>
            <StyledListItemButton sx={{ padding: '0px 0px', margin: '8px 24px' }} selected={pathName === "/v2/system-status"}>
              <ListItemIcon sx={{marginLeft: '8px'}}>
                <SettingsSuggestOutlinedIcon />
              </ListItemIcon>
              <ListItemText primary={text} />
            </StyledListItemButton>
            </Link >

          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Drawer open={open} onClose={toggleDrawer(false)} variant='permanent'
      sx={{
        width: 256,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 256, boxSizing: 'border-box' },
      }}>
      <Toolbar />
      {DrawerList}
    </Drawer>
  );
}