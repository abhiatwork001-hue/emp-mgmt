// Role-based access config
export const roleAccess: Record<string, string[]> = {
    "super_user": ["/dashboard", "/dashboard/approvals", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/positions", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/tips", "/dashboard/activity-log", "/dashboard/settings", "/dashboard/credentials"],
    "tech": ["/dashboard", "/dashboard/approvals", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/positions", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/tips", "/dashboard/activity-log", "/dashboard/settings", "/dashboard/problems", "/dashboard/credentials"],
    "owner": ["/dashboard", "/dashboard/approvals", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/positions", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/settings", "/dashboard/problems", "/dashboard/credentials", "/dashboard/activity-log"],
    "admin": ["/dashboard", "/dashboard/approvals", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/positions", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/problems", "/dashboard/settings", "/dashboard/credentials", "/dashboard/activity-log"],
    "hr": ["/dashboard", "/dashboard/approvals", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/positions", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/settings", "/dashboard/problems", "/dashboard/credentials", "/dashboard/activity-log"],

    // Store Manager - NO Employees/Positions/Approvals (Check context rules), NO Global Depts, NO Settings. HAS Tips.
    // User Update: Employees/Positions removed. Approvals removed (view context only in widgets).
    "store_manager": ["/dashboard", "/dashboard/notices", "/dashboard/stores", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/tips"],

    // Dept Head (Global) - HAS Global Departments. NO Emp/Pos/Approv.
    "department_head": ["/dashboard", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages"],

    // Store Dept Head - NO Emp/Pos/Approv. Stores via context only.
    "store_department_head": ["/dashboard", "/dashboard/notices", "/dashboard/stores", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages"],

    // Employee - Basic Access
    "employee": ["/dashboard", "/dashboard/notices", "/dashboard/vacations", "/dashboard/absences", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages"]
};

// Mapping of functional permissions to paths (Overrides)
export const permissionAccess: Record<string, string[]> = {
    // "create_schedule": ["/dashboard/schedules"], // Covered by role
    // "manage_system": ["/dashboard/settings"] // Covered by role
};

export const hasAccess = (roles: string | string[], path: string, deptName: string = "", permissions: string[] = []) => {
    const rolesArray = Array.isArray(roles) ? roles : [roles];

    return rolesArray.some(role => {
        const normalizedRole = role.toLowerCase().replace(/ /g, "_");

        // Super users have access to everything
        if (["super_user"].includes(normalizedRole)) return true;

        // 1. Special Logic: Recipes (Kitchen Dept Only)
        if (path === "/dashboard/recipes") {
            const isKitchen = deptName.toLowerCase().includes("kitchen") ||
                deptName.toLowerCase().includes("cocina") ||
                deptName.toLowerCase().includes("cozinha") ||
                permissions.includes("view_recipes");
            const isAdminOrHR = ["admin", "hr", "tech", "owner", "super_user"].includes(normalizedRole);
            return isKitchen || isAdminOrHR;
        }

        // 2. Special Logic: Settings (HR/Owner/Tech Only - Admin is EXCLUDED)
        if (path === "/dashboard/settings") {
            return ["hr", "owner", "tech", "super_user"].includes(normalizedRole);
        }

        // 3. Special Logic: Tips (Store Manager/Tech Only)
        if (path === "/dashboard/tips") {
            return ["store_manager", "tech", "super_user"].includes(normalizedRole);
        }

        // 4. Special Logic: Global Departments (Admin, HR, DeptHead Global Only)
        if (path === "/dashboard/departments") {
            return ["admin", "hr", "department_head", "tech", "super_user"].includes(normalizedRole);
        }

        // 5. Special Logic: Activity Log (Tech, Super User, Owner, Admin, HR)
        if (path === "/dashboard/activity-log" || path === "/dashboard/activities") {
            return ["tech", "super_user", "owner", "admin", "hr"].includes(normalizedRole);
        }

        // 6. Standard Role Lookup
        const allowed = roleAccess[normalizedRole] || roleAccess["employee"] || [];

        // Exact match check
        if (allowed.some(p => path === p)) return true;

        // Sub-path check
        const isSubPath = allowed.some(p => path.startsWith(p + "/") && p !== "/dashboard");
        return isSubPath;
    });
};
