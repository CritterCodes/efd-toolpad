import { AppProvider } from "@toolpad/core/AppProvider";
import { SessionProvider } from "next-auth/react";
import ClientThemeProvider from "../components/ThemeProvider";
import { RepairsProvider } from "./context/repairs.context";
import { auth } from "../../auth";
import { signIn, signOut } from "next-auth/react";
import { getNavigationForRole, canAccessAdmin } from "@/lib/roleBasedNavigation";
import RoleAwareNavigationProvider from "@/components/RoleAwareNavigationProvider";
import { UnifiedUserService, USER_ROLES } from "@/lib/unifiedUserService";
import Image from 'next/image';
import { redirect } from 'next/navigation';

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
                    <RepairsProvider>
                        <ClientThemeProvider>
                            <RoleAwareNavigationProvider
                                session={session}
                                branding={BRANDING}
                                authentication={AUTHENTICATION}
                            >
                                {children}
                            </RoleAwareNavigationProvider>
                        </ClientThemeProvider>
                    </RepairsProvider>
                </SessionProvider>
            </body>
        </html>
    );
}
