import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { getAllVacationRequests } from "@/lib/actions/vacation.actions";
import { getAllAbsenceRequests } from "@/lib/actions/absence.actions";
import { EmployeeDashboard } from "@/components/dashboard/role-views/employee-dashboard";
import { StoreManagerDashboard } from "@/components/dashboard/role-views/store-manager-dashboard";
import { DepartmentHeadDashboard } from "@/components/dashboard/role-views/department-head-dashboard";
import { getEmployeesByStore } from "@/lib/actions/employee.actions";

// Helper to merge requests sort by date
function mergeRequests(vacations: any[], absences: any[]) {
    const all = [
        ...vacations.map(v => ({ ...v, type: 'vacation' })),
        ...absences.map(a => ({ ...a, type: 'absence' }))
    ];
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export default async function DashboardPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const employee = await getEmployeeById((session.user as any).id);
    if (!employee) {
        return <div className="p-8 text-white">Employee record not found. Please contact admin.</div>;
    }

    // Determine Role & Dashboard Type
    // Roles hierarchy: Owner > Admin > Manager > Dept Head > Employee
    // We can check roles array or position.

    const roles = employee.roles || [];
    const isOwner = roles.includes("owner");
    const isAdmin = roles.includes("admin");
    const isManager = roles.includes("manager"); // Store Manager
    const isDeptHead = employee.storeDepartmentId?.headOfDepartment?.toString() === employee._id.toString();

    // Data Preparation

    // 1. Store Manager Dashboard Logic
    if (isOwner || isAdmin || isManager) {
        // Fetch Store-wide data
        const storeId = employee.storeId?._id || employee.storeId;

        // Pending Requests (Vacations & Absences) for THIS store (or all if admin/owner?)
        // Let's filter by store if we have IDs or fetch all and filter in memory if needed.
        // For simplicity, let's assume we fetch all pending and filter by store if possible, 
        // OR better: we need actions that support filtering by StoreID.
        // The existing actions support filtering by status.

        let pendingVacations = await getAllVacationRequests({ status: 'pending' });
        let pendingAbsences = await getAllAbsenceRequests({ status: 'pending' });

        // Filter by Store if Manager (and not global admin wanting to see everything?)
        // Ideally Admins see all. Managers see their store.
        if (storeId) {
            // We need to know if the requestor belongs to the store. 
            // The populated 'employeeId' field has the data.
            pendingVacations = pendingVacations.filter((r: any) => r.employeeId?.storeId === storeId);
            pendingAbsences = pendingAbsences.filter((r: any) => r.employeeId?.storeId === storeId);
        }

        const pendingRequests = mergeRequests(pendingVacations, pendingAbsences);

        // Simple Store Stats
        // We can fetch employees for this store to count.
        const storeEmployees = storeId ? await getEmployeesByStore(storeId) : [];
        const onVacationCount = 0; // TODO: Calculate efficiently from active vacation records

        const storeStats = {
            totalEmployees: storeEmployees.length,
            onVacation: onVacationCount,
            todayShifts: 12 // Placeholder or fetch actual
        };

        return <StoreManagerDashboard employee={employee} pendingRequests={pendingRequests} storeStats={storeStats} />;
    }

    // 2. Department Head Dashboard Logic
    if (isDeptHead) {
        const storeId = employee.storeId?._id || employee.storeId;
        const deptId = employee.storeDepartmentId?._id || employee.storeDepartmentId;

        let pendingVacations = await getAllVacationRequests({ status: 'pending' });
        let pendingAbsences = await getAllAbsenceRequests({ status: 'pending' });

        // Filter by Department
        if (deptId) {
            pendingVacations = pendingVacations.filter((r: any) => r.employeeId?.storeDepartmentId === deptId);
            pendingAbsences = pendingAbsences.filter((r: any) => r.employeeId?.storeDepartmentId === deptId);
        }

        const pendingRequests = mergeRequests(pendingVacations, pendingAbsences);

        // Dept Stats
        const deptStats = {
            totalEmployees: 5, // Placeholder - need getEmployeesByDept action
            onVacation: 0,
            todayShifts: 4
        };

        return <DepartmentHeadDashboard employee={employee} pendingRequests={pendingRequests} deptStats={deptStats} />;
    }

    // 3. Employee Dashboard (Default)
    return <EmployeeDashboard employee={employee} />;
}
