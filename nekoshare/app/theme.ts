'use client';

import { createTheme } from '@mui/material/styles';

const darkTheme = createTheme({
    palette: {
      mode: 'dark',
    },
    
    typography: {
        fontFamily: 'var(--font-roboto)',
      },
});

export default darkTheme;
