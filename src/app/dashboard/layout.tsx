import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);
    const user = (session?.user as any) || {};
    const userRoles = user.roles || [];

    // Determine primary role for Sidebar
    let primaryRole = "employee";
    if (userRoles.includes("owner")) primaryRole = "owner";
    else if (userRoles.includes("hr")) primaryRole = "hr";
    else if (userRoles.includes("store_manager")) primaryRole = "store_manager";
    else if (userRoles.includes("department_head")) primaryRole = "department_head";

    return (
        <div className="h-full relative bg-background text-foreground min-h-screen">
            <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
                <Sidebar userRole={primaryRole} />
            </div>
            <main className="md:pl-72 h-full">
                <Header />
                <div className="px-8 pb-8 h-full">
                    {children}
                </div>
            </main>
        </div>
    );
}
