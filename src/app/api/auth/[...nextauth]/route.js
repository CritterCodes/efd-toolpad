import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import AuthController from "./controller";

const handler = NextAuth({
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        }),
        CredentialsProvider({
            name: "Email & Password",
            credentials: {
                email: { label: "Email", type: "text" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                // ✅ Now calling the controller instead of service directly
                return await AuthController.handleEmailLogin(credentials.email, credentials.password);
            }
        })
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (account.provider === "google") {
                return await AuthController.handleGoogleLogin(user);
            }
            return true;
        },
        async jwt({ token, user }) {
            if (user) {
                token.email = user.email;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            session.user = {
                email: token.email,
                role: token.role
            };
            return session;
        }
    },
    secret: process.env.NEXTAUTH_SECRET,
    pages: {
        signIn: "/login",
    }
});

export { handler as GET, handler as POST };
