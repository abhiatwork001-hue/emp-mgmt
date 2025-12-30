// Role-based access config
export const roleAccess: Record<string, string[]> = {
    "super_user": ["/dashboard", "/dashboard/approvals", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/positions", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/tips"],
    "tech": ["/dashboard", "/dashboard/approvals", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/positions", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/tips"],
    "owner": ["/dashboard", "/dashboard/approvals", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/positions", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/tips"],
    "admin": ["/dashboard", "/dashboard/approvals", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/positions", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/tips"],
    "hr": ["/dashboard", "/dashboard/approvals", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/positions", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages"],
    "store_manager": ["/dashboard", "/dashboard/notices", "/dashboard/stores", "/dashboard/schedules", "/dashboard/recipes", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/tips"],
    "department_head": ["/dashboard", "/dashboard/notices", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/schedules", "/dashboard/recipes"],
    "store_department_head": ["/dashboard", "/dashboard/notices", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/schedules", "/dashboard/recipes"],
    "employee": ["/dashboard", "/dashboard/notices", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/profile"]
};

// Mapping of functional permissions to paths
export const permissionAccess: Record<string, string[]> = {
    "create_schedule": ["/dashboard/schedules"],
    "review_schedule": ["/dashboard/approvals", "/dashboard/schedules"],
    "manage_store": ["/dashboard/stores"],
    "create_employee": ["/dashboard/employees"],
    "edit_employee": ["/dashboard/employees"],
    "manage_storeDepartmentEmployee": ["/dashboard/employees", "/dashboard/stores"],
    "manage_department": ["/dashboard/departments"],
    "manage_storeDepartment": ["/dashboard/stores", "/dashboard/schedules"],
    "manage_system": ["/dashboard/positions", "/dashboard/settings"],
    "view_logs": ["/dashboard/settings"]
};

export const hasAccess = (role: string, path: string, deptName: string = "", permissions: string[] = []) => {
    const normalizedRole = role.toLowerCase().replace(/ /g, "_");

    // 1. Check Permissions first (Functional override)
    for (const perm of permissions) {
        const allowedPaths = permissionAccess[perm] || [];
        if (allowedPaths.some(p => path === p || (path.startsWith(p + "/") && p !== "/dashboard"))) {
            return true;
        }
    }

    const allowed = roleAccess[normalizedRole] || roleAccess["employee"] || [];

    // Exact match check
    if (allowed.some(p => path === p)) return true;

    // Sub-path check (for dynamic routes like /dashboard/stores/[id])
    const isSubPath = allowed.some(p => path.startsWith(p + "/") && p !== "/dashboard");

    if (path === "/dashboard/recipes") {
        const isKitchenOrBar = deptName.toLowerCase().includes("kitchen") || deptName.toLowerCase().includes("bar") || normalizedRole.includes("chef") || normalizedRole.includes("barman");
        const isAdmin = ["admin", "owner", "super_user", "tech"].includes(normalizedRole);
        return isKitchenOrBar || isAdmin || allowed.includes(path);
    }

    return isSubPath;
};
