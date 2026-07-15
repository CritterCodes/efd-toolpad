import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';

const baseURL = `${process.env.NEXT_PUBLIC_URL}`;

const providers = [
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
                        image: user.image,
                        artisanTypes: user.artisanTypes || [],
                        staffCapabilities: user.staffCapabilities,
                        employment: user.employment
                    } :
                    {
                        userID: user.userID,
                        storeID: user.storeID,
                        name: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        role: user.role,
                        token: user.token,
                        image: user.image,
                        artisanTypes: user.artisanTypes || [],
                        staffCapabilities: user.staffCapabilities,
                        employment: user.employment
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
    // Auth.js otherwise rejects ordinary self-hosted/local production requests
    // unless a platform-specific environment variable implicitly enables this.
    // Next.js supplies the request URL, and our redirects remain same-origin.
    trustHost: true,
    pages: {
        signIn: '/auth/signin',
    },
    callbacks: {
        async jwt({ token, account, user }) {
            if (account) {
                token.userID = user.userID;
                token.storeID = user.storeID || '';
                token.name = user.name;
                token.role = user.role;
                token.image = user.image;
                token.artisanTypes = user.artisanTypes || [];
                token.staffCapabilities = user.staffCapabilities || null;
                token.employment = user.employment || null;
            }
            return token;
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
            session.user.artisanTypes = token.artisanTypes || [];
            session.user.staffCapabilities = token.staffCapabilities || null;
            session.user.employment = token.employment || null;
            return session;
        },
        
    }
    
});
