import HorizontalRuleOutlinedIcon from '@mui/icons-material/HorizontalRuleOutlined';
import { Box, IconButton, SvgIcon } from '@mui/material';
import { useState, useEffect, useContext } from 'react';
import { ToolsEnum, useToolContext } from './DrawingTool';
import { IChartApi } from 'lightweight-charts';

interface HorizontalLineButtonProps {
    chart: IChartApi;
}
export default function HorizontalLineButton({ chart}: HorizontalLineButtonProps) {
    const [color, setColor] = useState('white');
    const {activedTool, setActivedTool} = useToolContext();
    useEffect(() => {
        setColor(activedTool === 'horizontalLine' ? '#25509f' : 'white')
    }, [activedTool])

    return (
        <Box>
            <IconButton onClick={()=>setActivedTool(activedTool === 'horizontalLine' ? null : 'horizontalLine')} title="水平线">
                <SvgIcon>
                <svg viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="7280" width="24" height="24"><path fill={color} d="M256 384a64 64 0 0 1 63.84 59.2L320 448v31.968h381.216l2.784 0.16V448a64 64 0 0 1 59.2-63.84L768 384h128a64 64 0 0 1 64 64v128a64 64 0 0 1-64 64h-128a64 64 0 0 1-64-64v-32.192l-2.784 0.192L320 543.968V576a64 64 0 0 1-59.2 63.808L256 640H128a64 64 0 0 1-63.84-59.2L64 576v-128a64 64 0 0 1 59.2-63.84L128 384h128z m0 64H128v128h128v-128z m640 0h-128v128h128v-128z"  p-id="7281"></path></svg>
                </SvgIcon>
            </IconButton>
        </Box>
    );
}