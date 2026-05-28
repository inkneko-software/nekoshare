import { createContext } from "react";
import dayjs from 'dayjs';
import { getLatestTradingDay } from '@/lib/chinese-holidays/TradingDays';

interface FocusContextProps {
    selectedTradeDate: dayjs.Dayjs;
    copyTableData?: () => void;
    setCopyTableData?: (fn: (() => void) | undefined) => void;
}

export const FocusContext = createContext<FocusContextProps>({ selectedTradeDate: dayjs(getLatestTradingDay()) });