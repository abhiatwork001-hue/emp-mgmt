import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, Link } from "@/i18n/routing";
import connectToDB from "@/lib/db";
import { Employee } from "@/lib/models";
import { TipsCalculator } from "@/components/tips/tips-calculator";
import { TipsHistory } from "@/components/tips/tips-history";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Tips Distribution | Dashboard",
};

import { getAllStores } from "@/lib/actions/store.actions";
import { TipsStoreSelector } from "@/components/tips/tips-store-selector";
import { AccessDenied } from "@/components/auth/access-denied";

export default async function TipsPage({
    params,
    searchParams
}: {
    params: Promise<{ locale: string }>,
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const { locale } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect({ href: "/auth/signin", locale });
        return; // Ensure TypeScript knows execution stops here
    }

    await connectToDB();
    const employee = await Employee.findOne({ email: session.user?.email }).populate("storeId");

    if (!employee) {
        return <AccessDenied />;
    }

    const roles = (employee.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const allowedRoles = ["store_manager", "tech", "super_user"];
    const hasAccess = roles.some((r: string) => allowedRoles.includes(r));
    const isTech = roles.includes("tech") || roles.includes("super_user");

    if (!hasAccess) {
        return <AccessDenied />;
    }

    const resolvedParams = await searchParams;
    const stores = isTech ? await getAllStores() : [];

    // Determine the active store ID
    let activeStoreId = typeof resolvedParams.storeId === 'string' ? resolvedParams.storeId : (employee.storeId?._id?.toString() || "");

    // If tech and no store selected, default to first available
    if (isTech && !activeStoreId && stores.length > 0) {
        activeStoreId = stores[0]._id.toString();
    }

    if (!activeStoreId) {
        return (
            <div className="p-8 text-center space-y-4">
                <p className="text-muted-foreground italic">You must have an assigned store or select one to view tips.</p>
                <Link href="/dashboard" className="text-primary font-bold hover:underline">Go back to Dashboard</Link>
            </div>
        );
    }

    const activeStore = isTech
        ? stores.find((s: { _id: { toString: () => any; }; }) => s._id.toString() === activeStoreId)
        : employee.storeId;

    return (
        <div className="space-y-8 p-6">
            <div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Tips Distribution</h1>
                        <p className="text-muted-foreground italic">Calculate & finalize weekly tips for <span className="text-foreground font-bold">{activeStore?.name || "your store"}</span>.</p>
                    </div>
                    {isTech && <TipsStoreSelector stores={stores} initialStoreId={activeStoreId} />}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <TipsCalculator
                        storeId={activeStoreId}
                        userId={employee._id.toString()}
                    />
                </div>
                <div>
                    <TipsHistory storeId={activeStoreId} />
                </div>
            </div>
        </div>
    );
}
