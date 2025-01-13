import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';

const baseURL = `${process.env.NEXT_PUBLIC_URL}`;

const providers = [
    GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
                return {
                    userID: user.userID,
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
                    return {
                        userID: user.userID,
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
    secret: process.env.AUTH_SECRET,
    pages: {
        signIn: '/auth/signin',
    },
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.userID = user.userID;
                token.name = user.name;
                token.role = user.role;
                token.image = user.image;
            }
            return token;
        },
        async session({ session, token }) {
            if (token) {
                session.user.userID = token.userID;
                session.user.name = token.name;
                session.user.role = token.role;
                session.user.image = token.image;
            }
            return session;
        }
    }
});
