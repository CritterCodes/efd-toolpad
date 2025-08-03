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
import TaskIcon from '@mui/icons-material/Task';
import InventoryIcon from '@mui/icons-material/Inventory';
import EngineeringIcon from '@mui/icons-material/Engineering';
import SettingsIcon from '@mui/icons-material/Settings';

// ✅ Dynamic Navigation Based on Role
const getNavigation = (role) => [
    { segment: 'dashboard', title: 'Dashboard', icon: <DashboardIcon /> },
    { segment: 'repairs', title: 'Repairs', icon: <BuildIcon /> },
    ...(role === 'admin'
        ? [
            { 
              segment: 'admin/tasks', 
              title: 'Tasks', 
              icon: <TaskIcon />,
              children: [
                { segment: '', title: 'Tasks', icon: <TaskIcon /> },
                { segment: 'materials', title: 'Materials', icon: <InventoryIcon /> },
                { segment: 'processes', title: 'Processes', icon: <EngineeringIcon /> }
              ]
            },
            { segment: 'admin/settings', title: 'Admin Settings', icon: <AdminPanelSettingsIcon /> }
          ]
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
