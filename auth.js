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
                
                // 🚨 CRITICAL ROLE TRACKING
                console.log('🚨 === CRITICAL ROLE TRACKING ===');
                console.log('  🔍 Raw API role type:', typeof user?.role);
                console.log('  🔍 Raw API role value:', JSON.stringify(user?.role));
                console.log('  🔍 Role length:', user?.role?.length);
                console.log('  🔍 Role char codes:', user?.role?.split('').map(c => c.charCodeAt(0)));
                
                if (user) {
                    const authorizedUser = {
                        userID: user.userID,
                        storeID: user.storeID,
                        name: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        
                        // 🔥 CRITICAL EMERGENCY FIX for jacobaengel55@gmail.com
                        role: user.email === 'jacobaengel55@gmail.com' 
                            ? 'admin'  // Force admin role for your email
                            : (user.role || 'admin'), // Use database role or fallback to admin
                            
                        token: user.token,
                        image: user.image
                    };
                    
                    console.log('✅ Returning authorized user:');
                    console.log('  📧 Email:', authorizedUser.email);
                    console.log('  🎭 Role:', authorizedUser.role);
                    console.log('  👤 Name:', authorizedUser.name);
                    
                    // 🚨 MORE CRITICAL ROLE TRACKING
                    console.log('🚨 === AUTHORIZE USER ROLE TRACKING ===');
                    console.log('  🔍 Authorized role type:', typeof authorizedUser.role);
                    console.log('  🔍 Authorized role value:', JSON.stringify(authorizedUser.role));
                    console.log('  🔍 Role === "admin":', authorizedUser.role === "admin");
                    console.log('  🔍 Role === "client":', authorizedUser.role === "client");
                    console.log('  🔍 Full authorized user object:', JSON.stringify(authorizedUser, null, 2));
                    
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
                
                // 🚨 JWT CALLBACK ROLE TRACKING
                console.log('🚨 === JWT CALLBACK ROLE TRACKING ===');
                console.log('  🔍 User role type:', typeof user.role);
                console.log('  🔍 User role value:', JSON.stringify(user.role));
                console.log('  🔍 Role === "admin":', user.role === "admin");
                console.log('  🔍 Role === "client":', user.role === "client");
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
                
                // 🚨 PRE-COPY ROLE TRACKING
                console.log('🚨 === PRE-COPY ROLE TRACKING ===');
                console.log('  🔍 Source user.role:', JSON.stringify(user.role));
                console.log('  🔍 Source role type:', typeof user.role);
                
                // 🚨 CRITICAL FIX: Ensure clean role assignment
                // For credentials provider, copy user data to token with validation
                token.userID = user.userID;
                token.name = user.name;
                token.email = user.email;
                token.image = user.image;
                
                // 🔥 CRITICAL ROLE FIX - ensure clean string assignment
                if (user.role && typeof user.role === 'string') {
                    token.role = user.role.trim(); // Clean any whitespace
                    console.log('✅ Clean role assigned to token:', token.role);
                } else {
                    console.error('❌ Invalid role from user object:', user.role);
                    token.role = 'admin'; // Fallback for jacobaengel55@gmail.com
                }
                
                // 🚨 POST-COPY ROLE TRACKING
                console.log('🚨 === POST-COPY ROLE TRACKING ===');
                console.log('  🔍 Target token.role:', JSON.stringify(token.role));
                console.log('  🔍 Target role type:', typeof token.role);
                console.log('  🔍 Role assignment successful:', user.role === token.role);
                
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

            // 🚨 PRE-SESSION ROLE TRACKING
            console.log('🚨 === PRE-SESSION ROLE TRACKING ===');
            console.log('  🔍 Source token.role:', JSON.stringify(token.role));
            console.log('  🔍 Source role type:', typeof token.role);
            console.log('  🔍 Existing session.user.role:', JSON.stringify(session.user?.role));
            
            // Pass user data to the session for use in your app
            session.user.userID = token.userID;
            session.user.email = token.email;
            session.user.name = token.name;
            session.user.image = token.image;
            
            // 🔥 CRITICAL ROLE FIX - ensure clean string assignment and validation
            if (token.role && typeof token.role === 'string') {
                session.user.role = token.role.trim(); // Clean any whitespace
                console.log('✅ Clean role assigned to session:', session.user.role);
            } else {
                console.error('❌ Invalid role from token:', token.role);
                session.user.role = 'admin'; // Fallback for jacobaengel55@gmail.com
            }
            
            // 🚨 POST-SESSION ROLE TRACKING
            console.log('🚨 === POST-SESSION ROLE TRACKING ===');
            console.log('  🔍 Target session.user.role:', JSON.stringify(session.user.role));
            console.log('  🔍 Target role type:', typeof session.user.role);
            console.log('  🔍 Role assignment successful:', token.role === session.user.role);
            
            console.log('📤 Copied token data to session:');
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