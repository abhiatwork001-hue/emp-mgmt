
import { EmployeeForm } from "@/components/employees/employee-form";
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/i18n/routing";
import { Button } from "@/components/ui/button";

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const employee = await getEmployeeById(id);

    if (!employee) {
        notFound();
    }

    return (
        <div className="container mx-auto py-8 max-w-5xl space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild>
                    <Link href="/dashboard/employees">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-3xl font-black tracking-tight">Edit Employee</h1>
                    <p className="text-muted-foreground">Update profile, roles, and contract details.</p>
                </div>
            </div>

            <EmployeeForm mode="edit" employee={employee} />
        </div>
    );
}
