import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware({
    ...routing,
    localeDetection: true,
    localePrefix: 'always',
});

export default async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Check if route is protected (Dashboard)
    if (/\/dashboard(\/|$)/.test(pathname)) {
        const cookies = req.cookies.getAll();

        const secret = process.env.NEXTAUTH_SECRET;

        if (!secret) {
        }

        const token = await getToken({
            req,
            secret,
            secureCookie: process.env.NODE_ENV === "production"
        });

        if (!token) {
            // Extract locale from path if present
            const segments = pathname.split('/');
            const locale = segments[1];
            const isLocale = routing.locales.includes(locale as any);
            const targetLocale = isLocale ? locale : 'en';

            const url = new URL(`/${targetLocale}/login`, req.url);
            return NextResponse.redirect(url);
        }
        /*         console.log(`[Middleware] Token verified for user: ${token.sub}`); */
    }

    return intlMiddleware(req);
}

export const config = {
    // Match only internationalized pathnames
    // We explicitly exclude:
    // - api (API routes)
    // - _next (Next.js internals)
    // - _vercel (Vercel internals)
    // - files with extensions (e.g. favicon.ico, images)
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};

