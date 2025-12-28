import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import ScheduleDashboardClient from "./dashboard-client";

export default async function SchedulesPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Schedules</h2>
                    <p className="text-muted-foreground">Overview of department schedules and statuses.</p>
                </div>
            </div>

            <ScheduleDashboardClient />
        </div>
    );
}
