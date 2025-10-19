import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { logJWTData, logSessionData } from './src/lib/cookie-debug.js';

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
                console.log('\n🔐 === AUTHORIZE FUNCTION START ===');
                console.log('⏰ Timestamp:', new Date().toISOString());
                console.log('📧 Attempting login for:', credentials?.email);
                
                const apiUrl = getApiUrl();
                console.log('🌐 Auth calling API at:', apiUrl);
                
                const response = await fetch(`${apiUrl}/api/auth/signin`, {
                    method: "POST",
                    body: JSON.stringify(credentials),
                    headers: { "Content-Type": "application/json" }
                });

                console.log('📊 API Response status:', response.status);
                console.log('📊 API Response headers:', Object.fromEntries(response.headers.entries()));

                if (response.status === 403) {
                    // Client user trying to access admin panel - don't throw, just return null
                    console.error("❌ Client access denied - 403 status");
                    console.log('🔐 === AUTHORIZE FUNCTION END (403) ===\n');
                    return null;
                }

                if (!response.ok) {
                    console.error("❌ Login failed. Invalid credentials. Status:", response.status);
                    console.log('🔐 === AUTHORIZE FUNCTION END (ERROR) ===\n');
                    return null;
                }

                const user = await response.json();
                console.log('👤 User data received from API:');
                console.log('  📧 Email:', user?.email);
                console.log('  🎭 Role:', user?.role);
                console.log('  👤 Name:', user?.firstName, user?.lastName);
                console.log('  🆔 UserID:', user?.userID);
                console.log('  🏪 StoreID:', user?.storeID);
                
                if (user) {
                    const authorizedUser = {
                        userID: user.userID,
                        storeID: user.storeID,
                        name: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        role: user.role,
                        token: user.token,
                        image: user.image
                    };
                    
                    console.log('✅ Returning authorized user:');
                    console.log('  📧 Email:', authorizedUser.email);
                    console.log('  🎭 Role:', authorizedUser.role);
                    console.log('  👤 Name:', authorizedUser.name);
                    console.log('🔐 === AUTHORIZE FUNCTION END (SUCCESS) ===\n');
                    
                    return authorizedUser;
                } else {
                    console.log('❌ No user data received from API');
                    console.log('🔐 === AUTHORIZE FUNCTION END (NO USER) ===\n');
                    return null;
                }
            } catch (error) {
                console.error("❌ Login error:", error);
                console.log('🔐 === AUTHORIZE FUNCTION END (EXCEPTION) ===\n');
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
                // Fix: Use correct domain without 's' - repair.engelfinedesign.com
                domain: process.env.NODE_ENV === 'production' ? 'repair.engelfinedesign.com' : 'localhost',
                secure: process.env.NODE_ENV === 'production'
            }
        },
        callbackUrl: {
            name: `next-auth.callback-url`,
            options: {
                sameSite: 'lax',
                path: '/',
                // Fix: Use correct domain without 's' - repair.engelfinedesign.com
                domain: process.env.NODE_ENV === 'production' ? 'repair.engelfinedesign.com' : 'localhost',
                secure: process.env.NODE_ENV === 'production'
            }
        },
        csrfToken: {
            name: `next-auth.csrf-token`,
            options: {
                httpOnly: true,
                sameSite: 'lax',
                path: '/',
                // Fix: Use correct domain without 's' - repair.engelfinedesign.com
                domain: process.env.NODE_ENV === 'production' ? 'repair.engelfinedesign.com' : 'localhost',
                secure: process.env.NODE_ENV === 'production'
            }
        }
    },
    callbacks: {
        async jwt({ token, account, user }) {
            console.log('\n🎫 === JWT CALLBACK START ===');
            console.log('⏰ Timestamp:', new Date().toISOString());
            console.log('📊 Callback inputs:');
            console.log('  🔑 Has account:', !!account);
            console.log('  👤 Has user:', !!user);
            console.log('  🎫 Has existing token:', !!token);
            
            if (account) {
                console.log('🔗 Account data:');
                console.log('  Type:', account.type);
                console.log('  Provider:', account.provider);
            }
            
            if (user) {
                console.log('👤 Fresh user data from authorize:');
                console.log('  📧 Email:', user.email);
                console.log('  🎭 Role:', user.role);
                console.log('  👤 Name:', user.name);
                console.log('  🆔 UserID:', user.userID);
                console.log('  🏪 StoreID:', user.storeID);
            }
            
            if (token) {
                console.log('🎫 Existing token data:');
                console.log('  📧 Email:', token.email);
                console.log('  🎭 Role:', token.role);
                console.log('  👤 Name:', token.name);
                console.log('  🆔 Sub:', token.sub);
            }

            // When the user signs in (new session)
            if (account && user) {
                console.log('🔄 First login - copying user data to token');
                
                // For credentials provider, just copy user data to token
                token.userID = user.userID;
                token.name = user.name;
                token.role = user.role;
                token.email = user.email;
                token.image = user.image;
                
                console.log('✅ New credentials token created:');
                console.log('  📧 Email:', token.email);
                console.log('  🎭 Role:', token.role);
                console.log('  👤 Name:', token.name);
                console.log('  🆔 UserID:', token.userID);
                
                logJWTData(token, 'JWT_CALLBACK_NEW_TOKEN');
                console.log('🎫 === JWT CALLBACK END (NEW) ===\n');
                return token;
            }
    
            // For credentials authentication, we don't need token refresh
            // Just return the existing token with all data preserved
            console.log('🔄 Returning existing token');
            console.log('  🎭 Existing role:', token.role);
            
            logJWTData(token, 'JWT_CALLBACK_EXISTING_TOKEN');
            console.log('🎫 === JWT CALLBACK END (EXISTING) ===\n');
            return token;
        },
    
        async session({ session, token }) {
            console.log('\n👤 === SESSION CALLBACK START ===');
            console.log('⏰ Timestamp:', new Date().toISOString());
            
            console.log('📥 Input token:');
            logJWTData(token, 'SESSION_CALLBACK_INPUT_TOKEN');
            
            console.log('📥 Input session:');
            logSessionData(session, 'SESSION_CALLBACK_INPUT_SESSION');

            // Pass user data to the session for use in your app
            session.user.userID = token.userID;
            session.user.role = token.role;
            session.user.image = token.image;
            session.user.name = token.name;
            session.user.email = token.email;
            
            console.log('� Copied token data to session:');
            console.log('  📧 Email:', session.user.email);
            console.log('  🎭 Role:', session.user.role);
            console.log('  👤 Name:', session.user.name);
            console.log('  🆔 UserID:', session.user.userID);

            console.log('📤 Final session being returned:');
            logSessionData(session, 'SESSION_CALLBACK_RESULT');
            console.log('👤 === SESSION CALLBACK END ===\n');
            
            return session;
        },

        async redirect({ url, baseUrl }) {
            console.log('\n🔄 === REDIRECT CALLBACK START ===');
            console.log('⏰ Timestamp:', new Date().toISOString());
            console.log('🌐 Redirect called with:');
            console.log('  📍 URL:', url);
            console.log('  🏠 Base URL:', baseUrl);
            
            let redirectUrl;
            
            // Allows relative callback URLs
            if (url.startsWith("/")) {
                redirectUrl = `${baseUrl}${url}`;
                console.log('🔄 Relative URL redirect to:', redirectUrl);
            }
            // Allows callback URLs on the same origin
            else if (new URL(url).origin === baseUrl) {
                redirectUrl = url;
                console.log('🔄 Same origin redirect to:', redirectUrl);
            }
            // Default redirect to dashboard after successful signin
            else {
                redirectUrl = `${baseUrl}/dashboard`;
                console.log('🔄 Default dashboard redirect to:', redirectUrl);
            }
            
            console.log('✅ Final redirect URL:', redirectUrl);
            console.log('🔄 === REDIRECT CALLBACK END ===\n');
            
            return redirectUrl;
        },
        
    }
    
});

// No refresh token logic needed for credentials authentication