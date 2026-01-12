// Role-based access config
export const roleAccess: Record<string, string[]> = {
    "super_user": ["/dashboard", "/dashboard/pending-actions", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/positions", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/tips", "/dashboard/activity-log", "/dashboard/settings", "/dashboard/credentials"],
    "tech": ["/dashboard", "/dashboard/pending-actions", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/positions", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/tips", "/dashboard/activity-log", "/dashboard/settings", "/dashboard/problems", "/dashboard/credentials", "/dashboard/coverage"],
    "owner": ["/dashboard", "/dashboard/pending-actions", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/positions", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/settings", "/dashboard/problems", "/dashboard/credentials", "/dashboard/activity-log", "/dashboard/coverage"],
    "admin": ["/dashboard", "/dashboard/pending-actions", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/positions", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/problems", "/dashboard/settings", "/dashboard/credentials", "/dashboard/activity-log", "/dashboard/coverage"],
    "hr": ["/dashboard", "/dashboard/pending-actions", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/employees", "/dashboard/positions", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/settings", "/dashboard/problems", "/dashboard/credentials", "/dashboard/activity-log", "/dashboard/coverage"],

    // Store Manager - NO Employees/Positions/Approvals (Check context rules), NO Global Depts, NO Settings. HAS Tips.
    // User Update: Employees/Positions removed. Approvals removed (view context only in widgets).
    "store_manager": ["/dashboard", "/dashboard/pending-actions", "/dashboard/notices", "/dashboard/stores", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/tips", "/dashboard/coverage", "/dashboard/directory", "/dashboard/suppliers"],

    // Dept Head (Global) - HAS Global Departments. Can manage suppliers, directory, and recipes (if Kitchen dept).
    "department_head": ["/dashboard", "/dashboard/pending-actions", "/dashboard/notices", "/dashboard/stores", "/dashboard/departments", "/dashboard/recipes", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/suppliers", "/dashboard/directory", "/dashboard/employees"],

    // Store Dept Head - NO Emp/Pos/Approv. Stores via context only.
    "store_department_head": ["/dashboard", "/dashboard/pending-actions", "/dashboard/notices", "/dashboard/stores", "/dashboard/schedules", "/dashboard/vacations", "/dashboard/absences", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages"],

    // Employee - Basic Access
    "employee": ["/dashboard", "/dashboard/pending-actions", "/dashboard/stores", "/dashboard/notices", "/dashboard/profile", "/dashboard/notes", "/dashboard/tasks", "/dashboard/messages", "/dashboard/problems"]
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

        // Super users and High Level Roles have access to everything
        if (["super_user", "tech", "owner", "admin", "hr"].includes(normalizedRole)) return true;

        // 1. Special Logic: Recipes (Kitchen Dept Only + Department Heads)
        if (path === "/dashboard/recipes") {
            const kitchenRoles = ["chef", "head_chef", "cook", "kitchen_staff"];
            const isKitchen = deptName.toLowerCase().includes("kitchen") ||
                deptName.toLowerCase().includes("cocina") ||
                deptName.toLowerCase().includes("cozinha") ||
                kitchenRoles.includes(normalizedRole) ||
                permissions.includes("view_recipes");
            const isAdminOrHR = ["admin", "hr", "tech", "owner", "super_user"].includes(normalizedRole);
            const isDepartmentHead = normalizedRole === "department_head";
            return isKitchen || isAdminOrHR || isDepartmentHead;
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
        if (path === "/dashboard/departments" || path.startsWith("/dashboard/departments/")) {
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
