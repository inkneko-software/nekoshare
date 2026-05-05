import { createContext } from "react";
import dayjs from 'dayjs';
import { getLatestTradingDay } from '@/lib/chinese-holidays/TradingDays';

interface FocusContextProps {
    selectedTradeDate: dayjs.Dayjs;
}

export const FocusContext = createContext<FocusContextProps>({ selectedTradeDate: dayjs(getLatestTradingDay()) });