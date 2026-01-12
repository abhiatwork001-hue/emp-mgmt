import { NextRequest, NextResponse } from 'next/server';
import { getAllStoresRatings, finalizeStoreMonthlyStats } from '@/lib/actions/google-places.actions';

/**
 * Cron endpoint to automatically finalize monthly review statistics
 * Runs on the last day of each month
 * Protected by CRON_SECRET environment variable
 */
export async function GET(request: NextRequest) {
    try {
        // Verify cron secret
        const authHeader = request.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret) {
            console.error('CRON_SECRET not configured');
            return NextResponse.json(
                { error: 'Cron job not configured' },
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

        // Get previous month and year
        const now = new Date();
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const month = lastMonth.getMonth() + 1;
        const year = lastMonth.getFullYear();

        console.log(`Starting monthly finalization for ${year}-${month}`);

        // Get all stores
        const stores = await getAllStoresRatings();

        if (!stores || stores.length === 0) {
            return NextResponse.json({
                success: true,
                message: 'No stores found',
                processed: 0
            });
        }

        // Finalize each store
        const results = await Promise.allSettled(
            stores.map(async (store: any) => {
                const result = await finalizeStoreMonthlyStats(store._id, month, year);
                return {
                    storeId: store._id,
                    storeName: store.name,
                    ...result
                };
            })
        );

        // Count successes and failures
        const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
        const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length;

        console.log(`Finalization complete: ${successful} successful, ${failed} failed`);

        return NextResponse.json({
            success: true,
            message: `Finalized monthly stats for ${year}-${month}`,
            processed: stores.length,
            successful,
            failed,
            results: results.map(r =>
                r.status === 'fulfilled'
                    ? r.value
                    : { error: r.reason?.message || 'Unknown error' }
            )
        });

    } catch (error: any) {
        console.error('Cron job error:', error);
        return NextResponse.json(
            {
                error: 'Internal server error',
                message: error.message
            },
            { status: 500 }
        );
    }
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
    return GET(request);
}
