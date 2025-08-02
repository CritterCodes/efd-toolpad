import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

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

                // ✅ Check if user exists in the database
                const response = await fetch(`${baseURL}/api/users?query=${profile.email}`, {
                    method: "GET",
                    headers: { "Content-Type": "application/json" }
                });

                const existingUser = await response.json();
                console.log("Existing User:", existingUser);

                if (!response.ok || existingUser.length === 0) {
                    // ✅ Create the user if not found
                    const createResponse = await fetch(`${baseURL}/api/auth/register`, {
                        method: "POST",
                        body: JSON.stringify({
                            firstName: profile.given_name,
                            lastName: profile.family_name,
                            email: profile.email,
                            provider: 'google',
                            status: "verified"
                        }),
                        headers: { "Content-Type": "application/json" }
                    });
                    console.log("Create Response:", createResponse);
                    if (!createResponse.ok) {
                        throw new Error("Failed to create user.");
                    }

                    const newUser = await createResponse.json();
                    console.log("New User:", newUser);
                    return {
                        userID: newUser.user.userID,
                        name: `${newUser.user.firstName} ${newUser.user.lastName}`,
                        email: newUser.user.email,
                        role: newUser.user.role,
                        image: profile.picture
                    };
                }

                // ✅ Return existing user data
                const user = existingUser.user;
                return user.role === "client" ? {
                        userID: user.userID,
                        name: `${user.firstName} ${user.user.lastName}`,
                        email: user.email,
                        role: user.role,
                        image: profile.picture
                    } : 
                    {
                        userID: user.userID,
                        storeID: user.storeID,
                        name: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        role: user.role,
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
                const response = await fetch(`${baseURL}/api/auth/signin`, {
                    method: "POST",
                    body: JSON.stringify(credentials),
                    headers: { "Content-Type": "application/json" }
                });

                if (!response.ok) {
                    console.error("Login failed. Invalid credentials.");
                    return null;
                }

                const user = await response.json();
                if (user) {
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
