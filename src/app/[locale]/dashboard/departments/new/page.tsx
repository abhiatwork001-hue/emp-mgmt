import { DepartmentForm } from "@/components/departments/department-form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function NewDepartmentPage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" asChild>
                    <a href="/dashboard/departments">{"<"}</a>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Create New Department</h2>
                </div>
            </div>

            <div className="bg-card p-6 rounded-xl border">
                <DepartmentForm />
            </div>
        </div>
    );
}
