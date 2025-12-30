import { DepartmentForm } from "@/components/departments/department-form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getGlobalDepartmentBySlug } from "@/lib/actions/department.actions";
import { Link } from "@/i18n/routing";

export default async function EditDepartmentPage({ params }: { params: Promise<{ slug: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const { slug } = await params;
    const department = await getGlobalDepartmentBySlug(slug);

    if (!department) {
        return <div>Department not found</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white" asChild>
                    <Link href={`/dashboard/departments/${department.slug}`}>{"<"}</Link>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Edit Department</h2>
                </div>
            </div>

            <div className="bg-[#1e293b]/50 p-6 rounded-xl border border-zinc-800">
                <DepartmentForm initialData={department} />
            </div>
        </div>
    );
}
