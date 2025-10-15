import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { CleanUserService } from './src/lib/cleanUserService.js';

/**
 * Clean, simple NextAuth configuration
 * - Only credentials provider
 * - No complex auth provider logic
 * - Unified user handling
 */

const providers = [
    CredentialsProvider({
        name: 'credentials',
        credentials: {
            email: { label: 'Email Address', type: 'email' },
            password: { label: 'Password', type: 'password' }
        },
        async authorize(credentials) {
            try {
                console.log('🔐 [CLEAN_AUTH] Starting authentication for:', credentials.email);

                // Authenticate user with clean service
                const user = await CleanUserService.authenticateUser(credentials.email, credentials.password);
                
                if (!user) {
                    console.log('❌ [CLEAN_AUTH] Authentication failed for:', credentials.email);
                    return null;
                }

                console.log('✅ [CLEAN_AUTH] Authentication successful for:', user.email);

                // Return clean user object for NextAuth
                return {
                    id: user.userID,
                    userID: user.userID,
                    name: `${user.firstName} ${user.lastName}`.trim(),
                    email: user.email,
                    role: user.role,
                    status: user.status,
                    business: user.business || null,
                    image: user.image || null
                };

            } catch (error) {
                console.error('❌ [CLEAN_AUTH] Authorization error:', error);
                return null;
            }
        }
    })
];

export const providerMap = providers.map((provider) => {
    if (typeof provider === "function") {
        const providerData = provider();
        return { id: providerData.id, name: providerData.name };
    } else {
        return { id: provider.id, name: provider.name };
    }
});

const config = {
    providers,
    pages: {
        signIn: "/auth/signin",
    },
    callbacks: {
        async redirect({ url, baseUrl }) {
            console.log('🔄 [CLEAN_AUTH] Redirect callback - URL:', url, 'BaseURL:', baseUrl);
            
            // Always redirect to dashboard after successful auth
            if (url === baseUrl || url === `${baseUrl}/` || url.includes('/auth/')) {
                return `${baseUrl}/dashboard`;
            }
            
            // If it's a relative URL, make it absolute
            if (url.startsWith("/")) return `${baseUrl}${url}`;
            
            // If same origin, allow
            if (new URL(url).origin === baseUrl) return url;
            
            // Default to dashboard
            return `${baseUrl}/dashboard`;
        },

        async jwt({ token, user }) {
            console.log('🔍 [CLEAN_AUTH] JWT callback');
            
            if (user) {
                // New sign-in
                token.userID = user.userID;
                token.name = user.name;
                token.email = user.email;
                token.role = user.role;
                token.status = user.status;
                token.business = user.business;
                token.image = user.image;
                
                console.log('✅ [CLEAN_AUTH] JWT token created for:', user.email);
            }
            
            return token;
        },

        async session({ session, token }) {
            console.log('🔍 [CLEAN_AUTH] Session callback');
            
            if (token) {
                session.user.id = token.userID;
                session.user.userID = token.userID;
                session.user.name = token.name;
                session.user.email = token.email;
                session.user.role = token.role;
                session.user.status = token.status;
                session.user.business = token.business;
                session.user.image = token.image;
                
                console.log('✅ [CLEAN_AUTH] Session created for:', {
                    email: session.user.email,
                    role: session.user.role,
                    userID: session.user.userID
                });
            }
            
            return session;
        }
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
};

export const { handlers, auth, signIn, signOut } = NextAuth(config);
export default NextAuth(config);