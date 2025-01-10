"use client";

import * as React from 'react';
import PropTypes from 'prop-types';
import { AppProvider } from '@toolpad/core/AppProvider';
import { DashboardLayout } from '@toolpad/core/DashboardLayout';
import { useSession, signOut } from 'next-auth/react';
import Typography from '@mui/material/Typography';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BuildIcon from '@mui/icons-material/Build';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

// ✅ Dynamic Navigation Based on Role
const getNavigation = (role) => [
    { segment: 'dashboard', title: 'Dashboard', icon: <DashboardIcon /> },
    { segment: 'repairs', title: 'Repairs', icon: <BuildIcon /> },
    ...(role === 'admin'
        ? [{ segment: 'admin', title: 'Admin Page', icon: <AdminPanelSettingsIcon /> }]
        : [])
];

const Layout = ({ children }) => {
    const { data: session, status } = useSession();

    if (status === "loading") {
        return <Typography>Loading...</Typography>;
    }

    if (!session) {
        return <Typography>Please log in to continue.</Typography>;
    }

    const role = session.user?.role || 'client';
    const NAVIGATION = getNavigation(role);

    return (
        <AppProvider navigation={NAVIGATION}>
            <DashboardLayout>
                {children}
            </DashboardLayout>
        </AppProvider>
    );
};

Layout.propTypes = {
    children: PropTypes.node.isRequired,
};

export default Layout;
