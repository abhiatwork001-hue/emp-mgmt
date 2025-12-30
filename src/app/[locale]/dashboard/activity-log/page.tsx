import { ActivityLog } from "@/components/dashboard/activity-log";
import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const metadata: Metadata = {
    title: "Activity Log | The Chick",
    description: "Audit trail of system actions",
};

export default async function ActivityLogPage() {
    const session = await getServerSession(authOptions);
    const user = session?.user as any;

    // Only HR, Owner, Admin, Tech can see the full log. 
    // Others might only see their own (the component handles filter logic)
    const canSeeAll = user?.roles?.some((r: string) =>
        ['hr', 'owner', 'admin', 'tech', 'super_user'].includes(r.toLowerCase())
    );

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Activity</h1>
                    <p className="text-muted-foreground">Comprehensive audit trail of operations across the company.</p>
                </div>
            </div>

            <ActivityLog
                userId={!canSeeAll ? user?.id : undefined}
                userRoles={user?.roles}
            />
        </div>
    );
}
