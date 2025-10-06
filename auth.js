import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import { UnifiedUserService, AUTH_PROVIDERS } from './src/lib/unifiedUserService.js';

const baseURL = `${process.env.NEXT_PUBLIC_URL}`;

const providers = [
    GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authorization: {
            params: {
                scope: "https://www.googleapis.com/auth/calendar.readonly email profile",
                access_type: "offline",
                prompt: "consent",
            },
        },
        async profile(profile) {
            try {
                console.log("Google Profile:", profile);

                // Use the new hybrid authentication method
                const user = await UnifiedUserService.authenticateWithGoogle(profile, {
                    provider: AUTH_PROVIDERS.GOOGLE,
                    status: "active" // Google OAuth users are auto-approved
                });

                console.log("Unified User:", user);

                // Return user data for NextAuth session
                return {
                    userID: user.userID,
                    name: `${user.firstName} ${user.lastName}`,
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    providers: user.providers,
                    image: profile.picture
                };

            } catch (error) {
                console.error("Google Auth Error:", error);
                throw new Error("Failed to authenticate with Google.");
            }
        }
    }),
    CredentialsProvider({
        credentials: {
            email: { label: 'Email Address', type: 'email' },
            password: { label: 'Password', type: 'password' }
        },
        async authorize(credentials) {
            try {
                console.log("Attempting authentication for:", credentials.email);

                // First try Shopify authentication
                try {
                    console.log("Trying Shopify authentication...");
                    const result = await UnifiedUserService.authenticateWithShopify(
                        credentials.email, 
                        credentials.password
                    );

                    const user = result.user;
                    const shopifyAuth = result.shopifyAuth;

                    console.log("✅ Shopify Auth successful for:", user.email);

                    return {
                        userID: user.userID,
                        name: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        role: user.role,
                        status: user.status,
                        providers: user.providers,
                        shopifyAccessToken: shopifyAuth.accessToken,
                        image: user.image || null
                    };
                } catch (shopifyError) {
                    console.log("Shopify auth failed, trying legacy API...", shopifyError.message);
                    
                    // Fallback to existing API
                    const response = await fetch(`${baseURL}/api/auth/signin`, {
                        method: "POST",
                        body: JSON.stringify(credentials),
                        headers: { "Content-Type": "application/json" }
                    });

                    if (!response.ok) {
                        console.error("Legacy API auth also failed");
                        return null;
                    }

                    const user = await response.json();
                    if (user) {
                        console.log("✅ Legacy API auth successful for:", user.email);
                        return user.role === "client" ? {
                            userID: user.userID,
                            name: `${user.firstName} ${user.lastName}`,
                            email: user.email,
                            role: user.role,
                            token: user.token,
                            image: user.image
                        } : 
                        {
                            userID: user.userID,
                            storeID: user.storeID,
                            name: `${user.firstName} ${user.lastName}`,
                            email: user.email,
                            role: user.role,
                            token: user.token,
                            image: user.image
                        };
                    }
                    return null;
                }

            } catch (error) {
                console.error("Complete authentication failure:", error);
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
    callbacks: {
        async jwt({ token, account, user }) {
            console.log('🔍 JWT CALLBACK - Starting');
            console.log('📝 Account present:', !!account);
            console.log('📝 User data:', user ? {
                userID: user.userID,
                name: user.name,
                email: user.email,
                role: user.role,
                provider: user.provider
            } : 'No user data');
            
            // When the user signs in
            if (account) {
                console.log('✅ New sign-in, creating fresh token');
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token; // Store refresh token for later use
                token.accessTokenExpires = Date.now() + (account.expires_in || 3600) * 1000; // Calculate expiry time
                token.userID = user.userID;
                user.role === 'store' ? token.storeID = user.storeID : token.storeID = '';
                token.name = user.name;
                token.email = user.email;
                token.provider = user.provider;
                token.shopifyCustomerID = user.shopifyCustomerID;
                token.shopifyCustomerToken = user.shopifyCustomerToken;
                token.googleSub = user.googleSub;
                token.role = user.role;
                token.image = user.image;
                
                console.log('✅ Token created with:', {
                    userID: token.userID,
                    name: token.name,
                    email: token.email,
                    role: token.role,
                    provider: token.provider
                });
                console.log("JWT callback - New token created");
                return token;
            }
    
            // If there's an error from a previous refresh attempt, just return the token
            if (token.error === "RefreshAccessTokenError") {
                console.log("JWT callback - Previous refresh error, returning token as-is");
                return token;
            }

            // Return the token if the access token is still valid (with buffer)
            if (token.accessTokenExpires && Date.now() < token.accessTokenExpires - 60000) { // 1 minute buffer
                console.log('✅ Token still valid, returning existing token');
                return token;
            }
    
            // Refresh the token if it has expired
            console.log("JWT callback - Token expired, attempting refresh");
            return await refreshAccessToken(token);
        },
    
        async session({ session, token }) {
            console.log('🔍 SESSION CALLBACK - Starting');
            console.log('📝 Token data:', {
                userID: token.userID,
                name: token.name,
                email: token.email,
                provider: token.provider,
                role: token.role
            });
            console.log('📝 Initial session user:', {
                name: session.user?.name,
                email: session.user?.email
            });
            
            try {
                // Fetch fresh user data from database to ensure current information
                console.log('🔍 Fetching user from database with userID:', token.userID);
                const currentUser = await UnifiedUserService.findUserByUserID(token.userID);
                
                console.log('📋 Database user result:', currentUser ? {
                    userID: currentUser.userID,
                    firstName: currentUser.firstName,
                    lastName: currentUser.lastName,
                    email: currentUser.email,
                    role: currentUser.role,
                    authProvider: currentUser.authProvider
                } : 'USER NOT FOUND');
                
                if (currentUser) {
                    const constructedName = `${currentUser.firstName} ${currentUser.lastName}`.trim();
                    console.log('✅ Constructed name from DB:', constructedName);
                    
                    // Update session with current database values
                    session.user.id = currentUser.userID;
                    session.user.userID = currentUser.userID;
                    session.user.name = constructedName;
                    session.user.email = currentUser.email;
                    session.user.provider = currentUser.authProvider;
                    session.user.shopifyCustomerID = currentUser.shopifyCustomerID;
                    session.user.shopifyCustomerToken = currentUser.shopifyCustomerToken;
                    session.user.googleSub = currentUser.googleSub;
                    session.user.role = currentUser.role;
                    session.user.status = currentUser.status;
                    session.user.image = currentUser.profileImage || currentUser.avatar || token.image;
                    session.user.storeID = token.storeID;
                    
                    console.log('✅ Final session user after DB update:', {
                        name: session.user.name,
                        email: session.user.email,
                        userID: session.user.userID,
                        role: session.user.role
                    });
                } else {
                    console.log('⚠️ User not found in database, using token fallback');
                    // Fallback to token data if user not found in database
                    session.user.id = token.userID;
                    session.user.userID = token.userID;
                    session.user.name = token.name;
                    session.user.provider = token.provider;
                    session.user.shopifyCustomerID = token.shopifyCustomerID;
                    session.user.shopifyCustomerToken = token.shopifyCustomerToken;
                    session.user.googleSub = token.googleSub;
                    session.user.role = token.role;
                    session.user.image = token.image;
                    session.user.storeID = token.storeID;
                    
                    console.log('⚠️ Final session user after token fallback:', {
                        name: session.user.name,
                        email: session.user.email,
                        userID: session.user.userID
                    });
                }
                
                // Pass accessToken to the session for use in your app
                session.accessToken = token.accessToken;
                session.refreshToken = token.refreshToken;
                session.accessTokenExpires = token.accessTokenExpires;
                
                console.log('🎯 SESSION CALLBACK - Completed successfully');
                return session;
            } catch (error) {
                console.error('❌ Error in session callback:', error);
                console.error('❌ Error stack:', error.stack);
                // Fallback to token data on error
                session.accessToken = token.accessToken;
                session.refreshToken = token.refreshToken;
                session.accessTokenExpires = token.accessTokenExpires;
                session.user.userID = token.userID;
                session.user.storeID = token.storeID;
                session.user.role = token.role;
                session.user.image = token.image;
                
                console.log('⚠️ Using error fallback, final session user:', {
                    name: session.user.name,
                    userID: session.user.userID
                });
                return session;
            }
        },
        
    }
    
});

async function refreshAccessToken(token) {
    try {
        console.log("Attempting to refresh access token...");
        
        if (!token.refreshToken) {
            console.error("No refresh token available");
            return {
                ...token,
                error: "RefreshAccessTokenError",
            };
        }

        const url = "https://oauth2.googleapis.com/token";
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                grant_type: "refresh_token",
                refresh_token: token.refreshToken,
            }),
        });

        const refreshedTokens = await response.json();

        if (!response.ok) {
            console.error("Error refreshing access token - Response not ok:", refreshedTokens);
            throw refreshedTokens;
        }

        console.log("Access token refreshed successfully");
        return {
            ...token,
            accessToken: refreshedTokens.access_token,
            accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000, // 1 hour
            refreshToken: refreshedTokens.refresh_token || token.refreshToken, // Use old refresh token if none returned
        };
    } catch (error) {
        console.error("Error refreshing access token:", error);

        return {
            ...token,
            error: "RefreshAccessTokenError",
        };
    }
}
