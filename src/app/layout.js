import { AppProvider } from "@toolpad/core/AppProvider";
import { Experimental_CssVarsProvider as AppRouterCacheProvider } from '@mui/material/styles';
import DashboardIcon from "@mui/icons-material/Dashboard";
import BuildIcon from "@mui/icons-material/Handyman";
import BarChartIcon from "@mui/icons-material/Insights";
import PeopleIcon from "@mui/icons-material/People";
import InventoryIcon from "@mui/icons-material/Inventory2";
import AssignmentIcon from "@mui/icons-material/Assignment";
import SettingsIcon from "@mui/icons-material/Settings";
import ReceiptIcon from "@mui/icons-material/Receipt";
import HandymanIcon from "@mui/icons-material/Handyman";
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
        icon: <BuildIcon />
    },
    {
        segment: 'dashboard/repair-tasks',
        title: 'Repair Tasks',
        icon: <HandymanIcon />
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
    logo: <Image src='/logos/[efd]LogoBlack.png' alt="[efd] Logo" width={150} height={75} />,
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
                        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
                            <AppProvider
                                session={session}
                                navigation={[]}
                                branding={BRANDING}
                                authentication={AUTHENTICATION}
                                theme={theme}
                            >
                                {children}
                            </AppProvider>
                        </AppRouterCacheProvider>
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
                        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
                            <AppProvider
                                session={session}
                                navigation={NAVIGATION}
                                branding={BRANDING}
                                authentication={AUTHENTICATION}
                                theme={theme}
                            >
                                {children}
                            </AppProvider>
                        </AppRouterCacheProvider>
                    </RepairsProvider>
                </SessionProvider>
            </body>
        </html>
    );
}
