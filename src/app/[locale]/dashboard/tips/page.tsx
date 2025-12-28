import { getTranslations } from "next-intl/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import connectToDB from "@/lib/db";
import { Employee } from "@/lib/models";
import { TipsCalculator } from "@/components/tips/tips-calculator";
import { TipsHistory } from "@/components/tips/tips-history";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Tips Distribution | Dashboard",
};

export default async function TipsPage({ params }: { params: { locale: string } }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/auth/signin");

    await connectToDB();
    const employee = await Employee.findOne({ email: session.user?.email });

    // Access Control: Strict Store Manager Only
    // User Requirement: "storemanager can only access that"
    const roles = (employee.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const isStoreManager = roles.includes("store_manager");

    if (!isStoreManager || !employee.storeId) {
        return <div className="p-8">Access Denied. reliable only for Store Managers with an assigned store.</div>;
    }

    const t = await getTranslations("Common"); // Fallback

    return (
        <div className="space-y-8 p-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Tips Distribution</h1>
                <p className="text-muted-foreground">Calculate & finalize weekly tips for {employee.storeId.name || "your store"}.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                    <TipsCalculator
                        storeId={employee.storeId._id.toString()}
                        userId={employee._id.toString()}
                    />
                </div>
                <div>
                    <TipsHistory storeId={employee.storeId._id.toString()} />
                </div>
            </div>
        </div>
    );
}
