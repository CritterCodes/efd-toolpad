import { AppProvider } from "@toolpad/core/AppProvider";
import { SessionProvider } from "next-auth/react";
import ClientThemeProvider from "../components/ThemeProvider";
import { RepairsProvider } from "./context/repairs.context";
import { AdminSettingsProvider } from "@/context/AdminSettingsContext";
import { auth } from "@/lib/auth";
import { signIn, signOut } from "next-auth/react";
import { getNavigationForRole, canAccessAdmin } from "@/lib/roleBasedNavigation";
import RoleAwareNavigationProvider from "@/components/RoleAwareNavigationProvider";
import { UnifiedUserService, USER_ROLES } from "@/lib/unifiedUserService";
import Image from 'next/image';
import { redirect } from 'next/navigation';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

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

// PWA Metadata
export const metadata = {
    title: 'Engel Fine Design - Jewelry Repair Management',
    description: 'Complete jewelry repair and task management system for Engel Fine Design',
    manifest: '/manifest.json',
    icons: {
        icon: [
            { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
            { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ],
        apple: [
            { url: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' }
        ]
    },
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'EFD Admin'
    },
    formatDetection: {
        telephone: false
    },
    openGraph: {
        type: 'website',
        siteName: 'Engel Fine Design',
        title: 'EFD - Jewelry Repair Management',
        description: 'Complete jewelry repair and task management system'
    },
    twitter: {
        card: 'summary',
        title: 'EFD - Jewelry Repair Management',
        description: 'Complete jewelry repair and task management system'
    }
};

export const viewport = {
    themeColor: '#1976d2',
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover'
};

export default async function RootLayout({ children }) {
    let session = null;
    try {
        session = await auth();
    } catch (error) {
        console.error("Auth error (likely invalid session cookie):", error);
        // Session remains null, user will be treated as unauthenticated
    }

    // 🔒 REQUIRE AUTHENTICATION
    if (!session?.user) {
        return (
            <html lang="en" suppressHydrationWarning>
                <body>
                    <SessionProvider session={session}>
                        <ClientThemeProvider>
                            <AppProvider
                                session={session}
                                navigation={[]}
                                branding={BRANDING}
                                authentication={AUTHENTICATION}
                            >
                                {children}
                                <PWAInstallPrompt />
                            </AppProvider>
                        </ClientThemeProvider>
                    </SessionProvider>
                </body>
            </html>
        );
    }

    // 🚫 BLOCK CLIENT ROLE ACCESS - TEMPORARILY DISABLED
    // Clients should only use efd-shop, not efd-admin
    // All other roles (wholesaler, artisan, staff, dev, admin) can access admin panel
    // BUT: Allow signin page access even for clients to enable re-authentication
    /*
    if (!canAccessAdmin(session.user.role) && !pathname.includes('/auth/signin')) {
        console.log(`Access denied for role: ${session.user.role}`);
        // Redirect clients to the shop instead of showing admin panel
        redirect('https://engelfinedesign.com');
    }
    */

    // 🎯 ROLE-BASED NAVIGATION - Now handled by RoleAwareNavigationProvider
    const userNavigation = getNavigationForRole(session.user.role, session.user.artisanTypes); // Fallback for SSR

    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <SessionProvider session={session}>
                    <AdminSettingsProvider>
                        <RepairsProvider>
                            <ClientThemeProvider>
                                <RoleAwareNavigationProvider
                                    session={session}
                                    branding={BRANDING}
                                    authentication={AUTHENTICATION}
                                >
                                    {children}
                                    <PWAInstallPrompt />
                                </RoleAwareNavigationProvider>
                            </ClientThemeProvider>
                        </RepairsProvider>
                    </AdminSettingsProvider>
                </SessionProvider>
            </body>
        </html>
    );
}
