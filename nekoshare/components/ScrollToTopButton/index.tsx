'use client'
import { Button, IconButton } from "@mui/material"
import KeyboardDoubleArrowUpOutlinedIcon from '@mui/icons-material/KeyboardDoubleArrowUpOutlined';
export default function ScrollToTopButton() {
    return (
        <Button
            size="large"
            variant="contained"
            aria-label="menu"
            sx={{ mr: 2, position: 'fixed', bottom: 20, right: 20, zIndex: 1000 }}
            onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }) }}
        >
            <KeyboardDoubleArrowUpOutlinedIcon />
        </Button>
    )
}