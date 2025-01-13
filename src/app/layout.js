import { AppProvider } from "@toolpad/core/AppProvider";
import { Experimental_CssVarsProvider as AppRouterCacheProvider } from '@mui/material/styles';
import DashboardIcon from "@mui/icons-material/Dashboard";
import BuildIcon from "@mui/icons-material/Handyman";
import BarChartIcon from "@mui/icons-material/Insights";
import PeopleIcon from "@mui/icons-material/People";
import InventoryIcon from "@mui/icons-material/Inventory2";
import EventIcon from "@mui/icons-material/Event";
import AssignmentIcon from "@mui/icons-material/Assignment";
import MoveIcon from "@mui/icons-material/CompareArrows";
import WarningIcon from "@mui/icons-material/ReportProblem";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { SessionProvider } from "next-auth/react";
import theme from "../../theme";
import { RepairsProvider } from "./context/repairs.context";
import { auth } from "../../auth";
import { signIn, signOut } from "next-auth/react";

// ✅ Updated icons for better visual clarity
const getClientNavigation = (userID) => [
    {
        segment: `dashboard/${userID}`,
        title: 'Dashboard',
        icon: <DashboardIcon />
    },
    {
        segment: `dashboard/${userID}/repairs`,
        title: 'Repairs',
        icon: <BuildIcon />,
    },
    {
        segment: `dashboard/${userID}/appointments`,
        title: 'Appointments',
        icon: <EventIcon />
    },
    {
        segment: `dashboard/${userID}/jewelry`,
        title: 'Jewelry',
        icon: <InventoryIcon />
    }
];

const NAVIGATION = {
    admin: [
        {
            segment: 'dashboard',
            title: 'Dashboard',
            icon: <DashboardIcon />
        },
        {
            segment: 'dashboard/analytics',
            title: 'Analytics',
            icon: <BarChartIcon />
        },
        {
            segment: 'dashboard/appointments',
            title: 'Appointments',
            icon: <EventIcon />
        },
        {
            segment: 'dashboard/clients',
            title: 'Clients',
            icon: <PeopleIcon />
        },
        {
            segment: 'dashboard/inventory',
            title: 'Inventory',
            icon: <InventoryIcon />
        },
        {
            segment: 'dashboard/repairs',
            title: 'Repairs',
            icon: <BuildIcon />,
            children: [
                {
                    segment: '/all',
                    title: 'All Repairs',
                    icon: <AssignmentIcon />
                },
                {
                    segment: '/move',
                    title: 'Move',
                    icon: <MoveIcon />
                },
                {
                    segment: '/parts',
                    title: 'Parts',
                    icon: <WarningIcon />
                },
                {
                    segment: '/quality-control',
                    title: 'Quality Control',
                    icon: <CheckCircleIcon />
                },
            ]
        },
    ]
};

const BRANDING = {
    logo: <img src='/logos/[efd]LogoBlack.png' alt="[efd] Logo" style={{ maxWidth: '150px', height: 'auto' }} />,
    title: '',
};

const AUTHENTICATION = { signIn, signOut };

export default async function RootLayout({ children }) {
    const session = await auth();

    // ✅ Logging session and user details for debugging
    console.log("Session Data:", session);
    if (session?.user) {
        console.log("User Role:", session.user.role);
        console.log("User ID:", session.user.userID);
    } else {
        console.log("No session data or user found");
    }

    const userRole = session?.user?.role || "client";
    const userID = session?.user?.userID;
    const userNavigation = userRole === "client" ? getClientNavigation(userID) : NAVIGATION.admin;
    return (
        <html lang="en">
            <body>
                <SessionProvider session={session}>
                    <RepairsProvider>
                        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
                            <AppProvider
                                session={session}
                                navigation={userNavigation}
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
