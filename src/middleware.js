// src/middleware.js
import { withAuth } from "next-auth/middleware";

export default withAuth(
    async function middleware(req) {
        const { nextUrl, auth } = req;
        
        const role = auth?.user?.role || "client"; 

        // Prevent clients from accessing admin pages
        if (nextUrl.pathname.startsWith("/dashboard/admin") && role !== "admin") {
            return Response.redirect(new URL("/", nextUrl)); // Redirect non-admins to home
        }

        // Prevent admins from accessing client pages if necessary
        if (nextUrl.pathname.startsWith("/dashboard/client") && role !== "client") {
            return Response.redirect(new URL("/", nextUrl));
        }
    },
    {
        pages: {
            signIn: "/login",
        },
    }
);

export const config = {
    matcher: ["/dashboard/:path*"], // Protect all dashboard routes
};
