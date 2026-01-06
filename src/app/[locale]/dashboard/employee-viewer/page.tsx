import { getViewerData } from "@/lib/actions/employee.actions";
import { ViewerClient } from "@/components/employees/viewer-client";
import { redirect } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export default async function EmployeeViewerPage({ params: { locale } }: { params: { locale: string } }) {
    const t = await getTranslations("EmployeeViewer");

    try {
        const { employees, stores, departments, role } = await getViewerData();

        // Final sanity check for access
        if (employees.length === 0 && !["tech", "admin", "hr", "owner"].some(r => role.includes(r))) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-card rounded-3xl border shadow-sm">
                    <h1 className="text-2xl font-black mb-2">Access Restricted</h1>
                    <p className="text-muted-foreground">You do not have permission to view employee schedules.</p>
                </div>
            );
        }

        return (
            <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex flex-col gap-2">
                    <h1 className="text-4xl font-black tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('description')}</p>
                </div>

                <ViewerClient
                    initialEmployees={employees}
                    stores={stores}
                    departments={departments}
                    role={role}
                />
            </div>
        );
    } catch (error) {
        console.error("Employee Viewer Page Error:", error);
        redirect("/dashboard");
    }
}
