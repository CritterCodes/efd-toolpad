import { AppProvider } from "@toolpad/core/AppProvider";
import { ThemeProvider } from '@mui/material/styles';
import DashboardIcon from "@mui/icons-material/Dashboard";
import BuildIcon from "@mui/icons-material/Handyman";
import BarChartIcon from "@mui/icons-material/Insights";
import PeopleIcon from "@mui/icons-material/People";
import InventoryIcon from "@mui/icons-material/Inventory2";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SettingsIcon from "@mui/icons-material/Settings";
import ReceiptIcon from "@mui/icons-material/Receipt";
import HandymanIcon from "@mui/icons-material/Handyman";
import ListIcon from "@mui/icons-material/List";
import ReceivingIcon from "@mui/icons-material/Inbox";
import MoveUpIcon from "@mui/icons-material/DriveFileMove";
import PickupIcon from "@mui/icons-material/LocalShipping";
import QualityIcon from "@mui/icons-material/VerifiedUser";
import PartsIcon from "@mui/icons-material/Category";
import PrintIcon from "@mui/icons-material/Print";
import { SessionProvider } from "next-auth/react";
import theme from "../../theme";
import { RepairsProvider } from "./context/repairs.context";
import { auth } from "../../auth";
import { signIn, signOut } from "next-auth/react";
import Image from 'next/image';

// 🎯 ADMIN-ONLY CRM NAVIGATION
// Simplified navigation for internal admin use only
const NAVIGATION = [
    {
        segment: 'dashboard',
        title: 'Dashboard',
        icon: <DashboardIcon />
    },
    {
        segment: 'dashboard/clients',
        title: 'Clients',
        icon: <PeopleIcon />
    },
    {
        segment: 'dashboard/repairs',
        title: 'Repairs',
        icon: <BuildIcon />,
        children: [
            {
                segment: 'receiving',
                title: 'Receiving',
                icon: <ReceivingIcon />
            },
            {
                segment: 'parts',
                title: 'Parts',
                icon: <PartsIcon />
            },
            {
                segment: 'ready-for-work',
                title: 'Ready for Work',
                icon: <ListIcon />
            },
            {
                segment: 'quality-control',
                title: 'Quality Control',
                icon: <QualityIcon />
            },
            {
                segment: 'pick-up',
                title: 'Payment & Pickup',
                icon: <PickupIcon />
            },
            {
                segment: 'move',
                title: 'Move',
                icon: <MoveUpIcon />
            },
            {
                segment: 'bulk-print',
                title: 'Bulk Print',
                icon: <PrintIcon />
            }
        ]
    },
    {
        segment: 'dashboard/admin/tasks',
        title: 'Tasks',
        icon: <HandymanIcon />,
        children: [
            {
                segment: '',
                title: 'Tasks',
                icon: <BuildIcon />
            },
            {
                segment: 'materials',
                title: 'Materials',
                icon: <InventoryIcon />
            },
            {
                segment: 'processes',
                title: 'Processes',
                icon: <SettingsIcon />
            }
        ]
    },
    {
        segment: 'dashboard/custom-tickets',
        title: 'Custom Tickets',
        icon: <ReceiptIcon />
    },
    {
        segment: 'dashboard/analytics',
        title: 'Analytics',
        icon: <BarChartIcon />
    },
    {
        segment: 'dashboard/admin/settings',
        title: 'Admin Settings',
        icon: <SettingsIcon />
    }
];

const BRANDING = {
    logo: <Image 
        src='/logos/[efd]LogoBlack.png' 
        alt="[efd] Logo" 
        width={150} 
        height={75} 
        style={{ width: 'auto', height: 'auto' }}
    />,
    title: 'Admin CRM',
};

const AUTHENTICATION = { signIn, signOut };

export default async function RootLayout({ children }) {
    const session = await auth();

    // 🔒 ADMIN-ONLY ACCESS - Require authentication for CRM access
    if (!session?.user) {
        return (
            <html lang="en">
                <body>
                    <SessionProvider session={session}>
                        <ThemeProvider theme={theme}>
                            <AppProvider
                                session={session}
                                navigation={[]}
                                branding={BRANDING}
                                authentication={AUTHENTICATION}
                                theme={theme}
                            >
                                {children}
                            </AppProvider>
                        </ThemeProvider>
                    </SessionProvider>
                </body>
            </html>
        );
    }

    // 🎯 ADMIN CRM - Simplified single navigation for all authenticated users
    return (
        <html lang="en">
            <body>
                <SessionProvider session={session}>
                    <RepairsProvider>
                        <ThemeProvider theme={theme}>
                            <AppProvider
                                session={session}
                                navigation={NAVIGATION}
                                branding={BRANDING}
                                authentication={AUTHENTICATION}
                                theme={theme}
                            >
                                {children}
                            </AppProvider>
                        </ThemeProvider>
                    </RepairsProvider>
                </SessionProvider>
            </body>
        </html>
    );
}
