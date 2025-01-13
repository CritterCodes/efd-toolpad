import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

const baseURL = `${process.env.NEXT_PUBLIC_URL}/api/auth/signin`;

const providers = [
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  }),
  Credentials({
    credentials: {
      email: { label: 'Email Address', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      try {
        const response = await fetch(baseURL, {
          method: 'POST',
          body: JSON.stringify(credentials),
          headers: { 'Content-Type': 'application/json' },
        });

        if (!response.ok) {
          return null;
        }

        const user = await response.json();
        return user;
      } catch (error) {
        console.error("Error in authorize:", error);
        return null;
      }
    },
  }),
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
        token.id = user.id;
        token.role = user.role; // Ensure the role is included in the token
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    }
  },
});
