'use client'
import FetchLog from "@/lib/FetchLog";
import { Typography } from "@mui/material";
import dayjs from "dayjs";
import { useEffect, useState } from "react";

export default function FetchStatus() {
    const [thsIndustryQuoteLog, setThsIndustryQuoteLog] = useState<FetchLog | null>(null);
    const [tdxStocksQuoteLog, setTdxStocksQuoteLog] = useState<FetchLog | null>(null);

    async function getFetchStatus() {
        let res = await fetch("/api/pysdk/fetch/getFetchLog?job_type=ths_industry_quote&count=1");
        if (!res.ok) {
            return;
        }
        let data = (await res.json()).data as FetchLog[];
        if (data.length > 0) {
            setThsIndustryQuoteLog(data[0]);
        }

        res = await fetch("/api/pysdk/fetch/getFetchLog?job_type=tdx_stocks_quote&count=1");
        if (!res.ok) {
            return;
        }
        data = (await res.json()).data as FetchLog[];
        if (data.length > 0) {
            setTdxStocksQuoteLog(data[0]);
        }
    }

    useEffect(() => {
        if (window === undefined) {
            return;
        }
        getFetchStatus()
        const timer = setInterval(() => {
            getFetchStatus()
        }, 10000);

        return () => clearInterval(timer);
    }
    , []);

    return (
        <>
            {
                thsIndustryQuoteLog !== null && <Typography variant="body1" sx={{ marginRight: 1 }} >板块：{dayjs(thsIndustryQuoteLog.created_at).format('YYYY-MM-DD HH:mm')}</Typography>

            }
            {
                tdxStocksQuoteLog !== null && <Typography variant="body1" sx={{ marginRight: 1 }} >日线行情：{dayjs(tdxStocksQuoteLog.created_at).format('YYYY-MM-DD HH:mm')}</Typography>

            }

        </>
    );
}