'use client'
import { Box } from "@mui/material";
import HorizontalLineButton from "./HorizontalLineButton";
import RectangleButton from "./RectangleButton";
import TrendLineButton from "./TrendLineButton";
import { createContext, useContext, useState } from "react";
import { IChartApi, ISeriesApi, SeriesType } from "lightweight-charts";



export type ToolsEnum = null | 'rectangle' | 'horizontalLine' | 'trendLine'
const ToolContext = createContext<{
    activedTool: ToolsEnum;
    setActivedTool: (tool: ToolsEnum) => void;
}>({
    activedTool: null,
    setActivedTool: () => { }
});

export function ToolProvider({ children }: { children: React.ReactNode }) {
    const [activedTool, setActivedTool] = useState<ToolsEnum>(null);
    return (
        <ToolContext.Provider value={{ activedTool: activedTool, setActivedTool: setActivedTool }}>
            {children}
        </ToolContext.Provider>
    );
}

export function useToolContext() {
    return useContext(ToolContext);
}

interface DrawingToolProps {
    chart: IChartApi;
    series: ISeriesApi<SeriesType>;
}
export default function DrawingTool({ chart, series }: DrawingToolProps) {
    const [selectedTool, setSelectedTool] = useState<ToolsEnum>(null);

    return (
        <Box id="drawing-tool" sx={{ display: 'flex', borderBottom: '1px solid gray' }} >
            <ToolProvider>
                <RectangleButton chart={chart} series={series} />
                <HorizontalLineButton chart={chart} />
                <TrendLineButton chart={chart} />
            </ToolProvider>

        </Box>
    );
}