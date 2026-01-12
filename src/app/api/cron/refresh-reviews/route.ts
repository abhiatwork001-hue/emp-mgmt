import { NextRequest, NextResponse } from 'next/server';
import { refreshAllStoresReviews } from '@/lib/actions/google-places.actions';

/**
 * Cron Job: Refresh Google Reviews for all stores
 * 
 * This endpoint is called hourly by Vercel Cron
 * Protected by CRON_SECRET environment variable
 * 
 * Setup in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/refresh-reviews",
 *     "schedule": "0 * * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret for security
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            console.error('CRON_SECRET not configured');
            return NextResponse.json(
                { error: 'Server configuration error' },
                { status: 500 }
            );
        }

        if (authHeader !== `Bearer ${cronSecret}`) {
            console.error('Unauthorized cron attempt');
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('🔄 Starting hourly reviews refresh...');
        const startTime = Date.now();

        // Refresh all stores
        const result = await refreshAllStoresReviews();

        const duration = Date.now() - startTime;
        console.log(`✓ Reviews refresh completed in ${duration}ms`);

        return NextResponse.json({
            duration,
            timestamp: new Date().toISOString(),
            ...result
        });

    } catch (error: any) {
        console.error('Cron job error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}

// Allow manual trigger via POST (for testing)
export async function POST(request: NextRequest) {
    try {
        // For manual triggers, you might want different auth or no auth in dev
        const isDev = process.env.NODE_ENV === 'development';

        if (!isDev) {
            const authHeader = request.headers.get('authorization');
            const cronSecret = process.env.CRON_SECRET;

            if (authHeader !== `Bearer ${cronSecret}`) {
                return NextResponse.json(
                    { error: 'Unauthorized' },
                    { status: 401 }
                );
            }
        }


        const result = await refreshAllStoresReviews();

        return NextResponse.json({
            manual: true,
            timestamp: new Date().toISOString(),
            ...result
        });

    } catch (error: any) {
        console.error('Manual refresh error:', error);
        return NextResponse.json(
            { error: error.message },
            { status: 500 }
        );
    }
}
