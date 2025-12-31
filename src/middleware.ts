import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { NextRequest } from 'next/server';

export default createMiddleware({
    ...routing,
    localeDetection: true, // Enable automatic locale detection
    localePrefix: 'always', // Always include locale prefix in URLs
});

export const config = {
    // Match only internationalized pathnames
    matcher: ['/', '/(de|en|pt)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
