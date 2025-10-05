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
                console.log("Shopify Auth attempt for:", credentials.email);

                // Use the new hybrid Shopify authentication method
                const result = await UnifiedUserService.authenticateWithShopify(
                    credentials.email, 
                    credentials.password
                );

                const user = result.user;
                const shopifyAuth = result.shopifyAuth;

                console.log("Shopify Auth successful for:", user.email);

                // Return user data for NextAuth session
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

            } catch (error) {
                console.error("Shopify Auth Error:", error);
                return null; // Return null for failed authentication
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
            // When the user signs in
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token; // Store refresh token for later use
                token.accessTokenExpires = Date.now() + (account.expires_in || 3600) * 1000; // Calculate expiry time
                token.userID = user.userID;
                user.role === 'store' ? token.storeID = user.storeID : token.storeID = '';
                token.name = user.name;
                token.role = user.role;
                token.image = user.image;
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
                return token;
            }
    
            // Refresh the token if it has expired
            console.log("JWT callback - Token expired, attempting refresh");
            return await refreshAccessToken(token);
        },
    
        async session({ session, token }) {
            // Pass accessToken to the session for use in your app
            session.accessToken = token.accessToken;
            session.refreshToken = token.refreshToken;
            session.accessTokenExpires = token.accessTokenExpires;
            session.user.userID = token.userID;
            session.user.storeID = token.storeID;
            session.user.role = token.role;
            session.user.image = token.image;
            return session;
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
