"use client";
import React from 'react';
import { styled, useTheme } from '@mui/material/styles';
import {
    Box, Drawer, CssBaseline, AppBar as MuiAppBar, Toolbar,
    List, Typography, Divider, IconButton, ListItem, ListItemButton,
    ListItemIcon, ListItemText, Button, Container
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import DiamondIcon from '@mui/icons-material/Diamond';
import BuildIcon from '@mui/icons-material/Build';

const drawerWidth = 240;

const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
    ({ theme, open }) => ({
        flexGrow: 1,
        padding: theme.spacing(3),
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
        }),
        marginLeft: open ? 0 : `-${drawerWidth}px`,
    }),
);

const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
    transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
        width: `calc(100% - ${drawerWidth}px)`,
        marginLeft: `${drawerWidth}px`,
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));

const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    ...theme.mixins.toolbar,
    justifyContent: 'flex-end',
}));

export default function HomePage() {
    const theme = useTheme();
    const [open, setOpen] = React.useState(false);

    const handleDrawerOpen = () => {
        setOpen(true);
    };

    const handleDrawerClose = () => {
        setOpen(false);
    };

    return (
        <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            
            {/* ✅ Header */}
            <AppBar position="fixed" open={open} sx={{ backgroundColor: "#333" }}>
                <Toolbar>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        onClick={handleDrawerOpen}
                        edge="start"
                        sx={{ mr: 2, ...(open && { display: 'none' }) }}
                    >
                        <MenuIcon />
                    </IconButton>
                    <Typography variant="h6" noWrap component="div">
                        Engel Fine Design
                    </Typography>
                </Toolbar>
            </AppBar>

            {/* ✅ Persistent Drawer */}
            <Drawer
                sx={{
                    width: drawerWidth,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': {
                        width: drawerWidth,
                        boxSizing: 'border-box',
                    },
                }}
                variant="persistent"
                anchor="left"
                open={open}
            >
                <DrawerHeader>
                    <IconButton onClick={handleDrawerClose}>
                        {theme.direction === 'ltr' ? <ChevronLeftIcon /> : <ChevronRightIcon />}
                    </IconButton>
                </DrawerHeader>
                <Divider />
                <List>
                    {['Custom Design', 'Jewelry Repair', 'About Us'].map((text, index) => (
                        <ListItem key={text} disablePadding>
                            <ListItemButton>
                                <ListItemIcon>
                                    {index % 2 === 0 ? <DiamondIcon /> : <BuildIcon />}
                                </ListItemIcon>
                                <ListItemText primary={text} />
                            </ListItemButton>
                        </ListItem>
                    ))}
                </List>
                <Divider />
                <List>
                    <ListItemButton href="/auth/signin">
                        <ListItemText primary="Login" />
                    </ListItemButton>
                    <ListItemButton href="/register">
                        <ListItemText primary="Create Account" />
                    </ListItemButton>
                </List>
            </Drawer>

            {/* ✅ Main Content Area with Hero Section */}
            <Main open={open}>
                <DrawerHeader />
                <Container maxWidth="md">
                    <Box
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            textAlign: 'center',
                            minHeight: '80vh',
                            gap: 3
                        }}
                    >
                        <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
                            Crafting Timeless Elegance
                        </Typography>
                        <Typography variant="h5" component="p">
                            Discover our exquisite **Art Deco** and **Traditional Jewelry Designs**.
                            Expert **custom design** and **jewelry repair** services tailored to you.
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
                            <Button variant="contained" color="primary" size="large" sx={{ backgroundColor: "#333" }}>
                                Schedule a Consultation
                            </Button>
                            <Button variant="outlined" size="large" href="/auth/signin">
                                Browse Services
                            </Button>
                        </Box>
                    </Box>
                </Container>
            </Main>
        </Box>
    );
}
