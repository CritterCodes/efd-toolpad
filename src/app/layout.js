import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { RepairsProvider } from "./context/repairs.context";
import { AdminSettingsProvider } from "@/context/AdminSettingsContext";
import { auth } from "@/lib/auth";
import RoleAwareNavigationProvider from "@/components/RoleAwareNavigationProvider";
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

export const dynamic = 'force-dynamic';

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
    themeColor: '#0D0D0D',
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

    // 🔒 Unauthenticated users are routed by middleware to /auth/* pages.
    // Render children directly here so custom auth pages (signin/forgot/reset) are visible.
    if (!session?.user) {
        return (
            <html lang="en" suppressHydrationWarning>
                <body>
                    {children}
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

    return (
        <html lang="en" suppressHydrationWarning>
            <body>
                <SessionProvider session={session}>
                    <AdminSettingsProvider>
                        <RepairsProvider>
                            <RoleAwareNavigationProvider>
                                {children}
                                <PWAInstallPrompt />
                            </RoleAwareNavigationProvider>
                        </RepairsProvider>
                    </AdminSettingsProvider>
                </SessionProvider>
            </body>
        </html>
    );
}
