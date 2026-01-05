import { getProblems } from "@/lib/actions/problem.actions";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ProblemsList } from "./problems-list";
import { authOptions } from "@/lib/auth"; // Verify path
import { getTranslations } from "next-intl/server";

export default async function ProblemsPage({ params }: { params: { locale: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const t = await getTranslations("Common");
    const user = session.user as any;

    // Determine filters based on role
    // Admins/HR/Owner/Tech -> See all
    // Store Managers -> See store
    // Employees -> See own

    const role = user.role || 'employee';
    const storeId = user.storeId;
    const departmentId = user.storeDepartmentId;

    const problems = await getProblems({
        userId: user.id,
        role: role,
        storeId: storeId,
        departmentId: departmentId,
        status: 'all'
    });

    return (
        <div className="space-y-6 p-6 pb-20">
            <div>
                <h1 className="text-3xl font-black tracking-tight text-foreground">
                    Problem Reports
                </h1>
                <p className="text-muted-foreground mt-2">
                    Manage and track reported issues across the organization.
                </p>
            </div>

            <ProblemsList initialProblems={problems} />
        </div>
    );
}
