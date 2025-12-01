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
                // Auth API call
                
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
                        name: `${user.firstName} ${user.lastName}`,
                        email: user.email,
                        
                        // 🔥 EMERGENCY FIX: Force admin role for jacobaengel55@gmail.com
                        role: user.email === 'jacobaengel55@gmail.com' 
                            ? 'admin'  // Force admin role for your email
                            : (user.role || 'admin'), // Use database role or fallback to admin
                            
                        // Include artisan types for navigation
                        artisanTypes: user.artisanTypes || [],
                            
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

// Export providers array for the signin page
export const providerMap = providers;

export const { handlers, auth, signIn, signOut } = NextAuth({
    providers,
    session: {
        strategy: "jwt",
    },
    pages: {
        signIn: '/auth/signin',
    },
    callbacks: {
        async jwt({ token, account, user }) {
            // When the user signs in with credentials
            if (user) {
                token.userID = user.userID;
                token.name = user.name;
                token.role = user.role;
                token.artisanTypes = user.artisanTypes || [];
                token.image = user.image;
            }
            return token;
        },
    
        async session({ session, token }) {
            // Pass user information to the session
            session.user.userID = token.userID;
            session.user.id = token.userID; // Add lowercase id for compatibility
            session.user.role = token.role;
            session.user.artisanTypes = token.artisanTypes || [];
            session.user.image = token.image;
            return session;
        },

        async redirect({ url, baseUrl }) {
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