'use client'
import { Typography } from "@mui/material";
import { useEffect,useState } from "react";

export default function Timer() {
    const [date, setDate] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => {
            setDate(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }
    , []);
    return (
        <Typography variant="body1" >{date.toLocaleDateString()} {date.toLocaleTimeString()}</Typography>
    );
}