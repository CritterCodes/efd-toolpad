import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
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
    callbacks: {
        async jwt({ token, account, user }) {
            // When the user signs in
            if (account) {
                token.accessToken = account.access_token;
                token.refreshToken = account.refresh_token; // Store refresh token for later use
                token.accessTokenExpires = Date.now() + (account.expires_in || 3600) * 1000; // Calculate expiry time
                token.userID = user.userID;
                user.role === user.role
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