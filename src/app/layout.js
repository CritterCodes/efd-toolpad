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

    // 🚫 BLOCK CLIENT ROLE ACCESS
    // Clients should only use efd-shop, not efd-admin
    if (session.user.role === USER_ROLES.CLIENT) {
        // Redirect clients to the shop instead of showing admin panel
        redirect('https://engelfinedesign.com');
    }

    // 🔒 VERIFY ADMIN ACCESS PERMISSIONS
    if (!canAccessAdmin(session.user.role)) {
        return (
            <html lang="en" suppressHydrationWarning>
                <body>
                    <SessionProvider session={session}>
                        <ClientThemeProvider>
                            <div style={{ 
                                display: 'flex', 
                                justifyContent: 'center', 
                                alignItems: 'center', 
                                height: '100vh',
                                flexDirection: 'column',
                                gap: '1rem'
                            }}>
                                <h1>Access Denied</h1>
                                <p>You do not have permission to access the admin panel.</p>
                                <p>Role: {session.user.role}</p>
                                <button onClick={() => signOut()}>Sign Out</button>
                            </div>
                        </ClientThemeProvider>
                    </SessionProvider>
                </body>
            </html>
        );
    }

    // 🎯 ROLE-BASED NAVIGATION - Now handled by RoleAwareNavigationProvider
    const userNavigation = getNavigationForRole(session.user.role); // Fallback for SSR

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
