import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

// Use internal URL for server-side calls, external for client-side
const getApiUrl = () => {
    // In server-side context, use internal localhost
    if (typeof window === 'undefined') {
        return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
    }
    // In client-side context, use the external URL
    return process.env.NEXT_PUBLIC_URL || window.location.origin;
};

const providers = [
    CredentialsProvider({
        credentials: {
            email: { label: 'Email Address', type: 'email' },
            password: { label: 'Password', type: 'password' }
        },
        async authorize(credentials) {
            try {
                const apiUrl = getApiUrl();
                console.log('Auth calling API at:', apiUrl);
                
                const response = await fetch(`${apiUrl}/api/auth/signin`, {
                    method: "POST",
                    body: JSON.stringify(credentials),
                    headers: { "Content-Type": "application/json" }
                });

                if (response.status === 403) {
                    // Client user trying to access admin panel - don't throw, just return null
                    console.error("Client access denied");
                    return null;
                }

                if (!response.ok) {
                    console.error("Login failed. Invalid credentials.");
                    return null;
                }

                const user = await response.json();
                
                if (user) {
                    return {
                        userID: user.userID,
                        storeID: user.storeID,
                        name: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        role: user.role,
                        token: user.token,
                        image: user.image
                    };
                }
            } catch (error) {
                console.error("Login error:", error);
                return null;
            }
        }
    })
];

export const providerMap = providers.map((provider) => {
    if (typeof provider === 'function') {
        const providerData = provider();
        return { id: providerData.id, name: providerData.name };
    }
    return { id: provider.id, name: provider.name };
});

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers,
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: '/auth/signin',
    },
    cookies: {
        sessionToken: {
            name: `next-auth.session-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                // Fix: Don't use shared domain for admin - use subdomain specific
                domain: process.env.NODE_ENV === 'production' ? 'repairs.engelsfinedesign.com' : 'localhost',
                secure: process.env.NODE_ENV === 'production'
            }
        },
        callbackUrl: {
            name: `next-auth.callback-url`,
            options: {
                sameSite: 'lax',
                path: '/',
                // Fix: Don't use shared domain for admin - use subdomain specific  
                domain: process.env.NODE_ENV === 'production' ? 'repairs.engelsfinedesign.com' : 'localhost',
                secure: process.env.NODE_ENV === 'production'
            }
        },
        csrfToken: {
            name: `next-auth.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                // Fix: Don't use shared domain for admin - use subdomain specific
                domain: process.env.NODE_ENV === 'production' ? 'repairs.engelsfinedesign.com' : 'localhost',
                secure: process.env.NODE_ENV === 'production'
            }
        }
    },
    callbacks: {
        async jwt({ token, account, user }) {
            console.log("🔍 JWT Callback triggered:", {
                hasAccount: !!account,
                hasUser: !!user,
                tokenRole: token?.role,
                userRole: user?.role,
                userEmail: user?.email || token?.email,
                userID: user?.userID
            });

            // When the user signs in (new session)
            if (account && user) {
                console.log("🆕 JWT callback - Setting up new token for credentials signin:", {
                    userID: user?.userID,
                    email: user?.email,
                    role: user?.role,
                    name: user?.name
                });

                // For credentials provider, just copy user data to token
                token.userID = user.userID;
                token.name = user.name;
                token.role = user.role;
                token.email = user.email;
                token.image = user.image;
                
                console.log("✅ JWT callback - New credentials token created with role:", token.role);
                return token;
            }
    
            // For credentials authentication, we don't need token refresh
            // Just return the existing token with all data preserved
            console.log("🔄 JWT callback - Returning existing token with role:", token.role);
            return token;
        },
    
        async session({ session, token }) {
            // Pass user data to the session for use in your app
            session.user.userID = token.userID;
            session.user.role = token.role;
            session.user.image = token.image;
            session.user.name = token.name;
            session.user.email = token.email;
            
            console.log("📋 Session callback - Creating session with role:", token.role);
            return session;
        },

        async redirect({ url, baseUrl }) {
            console.log('NextAuth redirect called:', { url, baseUrl });
            
            // Allows relative callback URLs
            if (url.startsWith("/")) {
                return `${baseUrl}${url}`;
            }
            
            // Allows callback URLs on the same origin
            if (new URL(url).origin === baseUrl) {
                return url;
            }
            
            // Default redirect to dashboard after successful signin
            return `${baseUrl}/dashboard`;
        },
        
    }
    
});

// No refresh token logic needed for credentials authentication