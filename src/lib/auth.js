// Auth utility wrapper for API routes and server code.
//
// `auth()` here is the RAW NextAuth session plus the live account state (services/users/
// accountRevocation.js): a terminated / suspended account reads as signed out on its very next
// request, and role / staffCapabilities / employment are the CURRENT database values rather than
// whatever was baked into the token at login. Every guard (lib/apiAuth, lib/authHelpers) and every
// route that imports `auth` from '@/lib/auth' gets this for free.
//
// `src/middleware.js` must NOT import from here: it runs on the Edge runtime, where the MongoDB
// driver cannot load. It imports the raw `auth` from the root auth.js directly (cookie-only check);
// pages then hit APIs that all pass through this wrapper, and a terminated account gets 401s.
import { auth as rawAuth } from '../../auth';
import { withLiveAccountState } from '@/services/users/accountRevocation';

export { handlers, signIn, signOut, providerMap } from '../../auth';

export async function auth(...args) {
    // `auth(handler)` / `auth(req, ctx)` wrapper forms are passed straight through untouched.
    if (args.length > 0) return rawAuth(...args);
    const session = await rawAuth();
    return withLiveAccountState(session);
}

// Backward compatibility for NextAuth v4 style imports
// In NextAuth v5, use auth() directly instead of getServerSession
export const authOptions = {};

// Helper for getting session in v5 (replaces old getServerSession)
export async function getServerSession() {
    throw new Error(
        'getServerSession from "next-auth/next" is no longer available in NextAuth v5. ' +
        'Use `import { auth } from "@/lib/auth"` and call `await auth()` instead.'
    );
}
