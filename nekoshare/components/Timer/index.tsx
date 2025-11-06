'use client'
import { Typography } from "@mui/material";
import { useEffect,useState } from "react";

export default function Timer() {
    const [date, setDate] = useState<Date | null>(null);
    useEffect(() => {
        if (window === undefined) {
            return;
        }
        const timer = setInterval(() => {
            setDate(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }
    , []);

    if (date === null) {
        return null;
    }

    return (
        <Typography variant="body1" > 当前时间 {date.toLocaleDateString()} {date.toLocaleTimeString()}</Typography>
    );
}