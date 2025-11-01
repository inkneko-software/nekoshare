import NorthEastOutlinedIcon from '@mui/icons-material/NorthEastOutlined';
import { Box, IconButton, SvgIcon } from '@mui/material';
import { useState, useEffect } from 'react';
import { ToolsEnum, useToolContext } from './DrawingTool';
import { IChartApi } from 'lightweight-charts';

interface TrendLineButtonProps {
    chart: IChartApi;
}
export default function TrendLineButton({ chart }: TrendLineButtonProps) {
    const [color, setColor] = useState('white');
    const {activedTool, setActivedTool} = useToolContext();

    useEffect(() => {
        setColor(activedTool === 'trendLine' ? '#25509f' : 'white')
    }, [activedTool])

    return (
        <Box>
            <IconButton onClick={() => setActivedTool(activedTool === 'trendLine' ? null : 'trendLine')} title='射线'>
               <SvgIcon htmlColor='white' >
               <svg  viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="10184" width="8" height="8"><path d="M541.824 536.448l-8.704 8.832M533.12 545.28L338.176 740.096a38.4 38.4 0 0 1-54.272 0 38.4 38.4 0 0 1 0-54.272l192.768-192.896M614.4 358.4L903.424 66.304a38.4 38.4 0 0 1 54.272 0 38.4 38.4 0 0 1 0 54.272L710.4 367.872" fill={color} p-id="10185"></path><path d="M214.4 972.8A156.8 156.8 0 1 1 371.2 816 157.056 157.056 0 0 1 214.4 972.8z m0-249.6A92.8 92.8 0 1 0 307.2 816a92.928 92.928 0 0 0-92.8-92.8zM572.8 601.6a155.648 155.648 0 0 1-65.92-14.464A156.928 156.928 0 1 1 572.8 601.6z m0-249.6a92.8 92.8 0 0 0-38.4 177.024 92.8 92.8 0 1 0 38.4-177.024z" fill={color} p-id="10186"></path></svg>
               </SvgIcon>
            </IconButton>
        </Box>
    );
}