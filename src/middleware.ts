import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
    function middleware(req) {
        // You can add custom logic here if needed, like role checking
        // The `withAuth` wrapper automatically ensures the user is logged in
        // before they reach this code for matched routes.
        return NextResponse.next();
    },
    {
        callbacks: {
            authorized: ({ token }) => !!token,
        },
    }
);

export const config = {
    matcher: [
        "/dashboard/:path*",
        "/admin/:path*",
        "/hr/:path*",
        "/manager/:path*",
        "/employee/:path*",
        // Add other protected routes here
    ],
};
