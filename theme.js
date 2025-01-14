"use client";
import { createTheme } from "@mui/material/styles";
import "@fontsource/roboto-mono";

// Create a theme with Roboto Mono as the primary font
const theme = createTheme({
    palette: {
        mode: "light",
        primary: {
            main: "#1976d2", 
        },
        secondary: {
            main: "#dc004e", 
        },
        background: {
            default: "#f5f5f5",
            paper: "#fff",
        },
        text: {
            primary: "#000000",
            secondary: "#555555",
        },
    },
    typography: {
        fontFamily: `"Roboto Mono", Arial, sans-serif`,
        h1: {
            fontFamily: "Roboto Mono",
        },
        h2: {
            fontFamily: "Roboto Mono",
        },
        body1: {
            fontFamily: "Roboto Mono",
        },
        button: {
            fontFamily: "Roboto Mono",
            textTransform: "none",
        },
        caption: {
            fontFamily: "Roboto Mono",
        },
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: "8px",
                },
            },
        },
    },
});

export default theme;
