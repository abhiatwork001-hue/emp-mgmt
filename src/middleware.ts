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
    // Matches: /en/dashboard, /pt/dashboard, /dashboard, etc.
    if (/\/dashboard(\/|$)/.test(pathname)) {
        const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

        if (!token) {
            // Extract locale from path if present
            const segments = pathname.split('/');
            const locale = segments[1];

            // Check if existing segment is a valid locale
            // routing.locales is likely ['en', 'pt', ...]
            const isLocale = routing.locales.includes(locale as any);

            // Use found locale, or default to 'en'
            const targetLocale = isLocale ? locale : 'en';

            const url = new URL(`/${targetLocale}/login`, req.url);
            // Optionally preserve the return URL? 
            // url.searchParams.set("callbackUrl", pathname); 

            return NextResponse.redirect(url);
        }
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

