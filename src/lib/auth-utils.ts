import { IPosition } from "./models";

/**
 * Priority ranking for dashboard views.
 * Lower index = Higher priority (more power).
 */
export const ROLE_PRIORITY = [
    "tech",
    "super_user",
    "owner",
    "hr",
    "admin",
    "department_head",
    "store_manager",
    "store_department_head",
    "employee"
];

/**
 * Determines the highest-access role from a list of roles based on the defined priority.
 */
export function getHighestAccessRole(roles: string[]): string {
    const normalizedRoles = roles.map(r => r.toLowerCase().trim());

    for (const priorityRole of ROLE_PRIORITY) {
        if (normalizedRoles.includes(priorityRole)) {
            return priorityRole;
        }
    }

    return "employee";
}

export function getAugmentedRolesAndPermissions(employee: any, singlePosition?: any, multiPositions?: any[]) {
    let roles: string[] = [];
    let permissions: string[] = [];

    // 1. Direct roles from employee document
    if (employee.roles && employee.roles.length > 0) {
        roles = [...employee.roles];
    } else if (employee.role) {
        roles.push(employee.role);
    }

    // 2. Aggregate from multiple positions (if available) or fallback to single position
    const positionsToProcess = multiPositions && multiPositions.length > 0
        ? multiPositions
        : (singlePosition ? [singlePosition] : []);

    positionsToProcess.forEach(position => {
        if (!position) return;

        const posName = (position.name || "").toLowerCase();

        // Title-to-role mappings
        if (posName.includes('owner') || posName.includes('partner')) roles.push('owner');
        if (posName.includes('hr')) roles.push('hr');
        if (posName.includes('store manager')) roles.push('store_manager');
        if (posName.includes('department head')) roles.push('department_head');
        if (posName.includes('tech') || posName.includes('developer')) roles.push('tech');

        // Functional Permissions from Position
        if (position.permissions && position.permissions.length > 0) {
            position.permissions.forEach((p: any) => {
                permissions.push(typeof p === 'string' ? p : (p as any).type || String(p));
            });
        }

        // Roles linked directly (IPosition.roles)
        if (position.roles && Array.isArray(position.roles)) {
            position.roles.forEach((r: any) => {
                if (typeof r === 'string') roles.push(r);
                else if (r.name) roles.push(r.name);
            });
        }
    });

    // Deduplicate and Normalize
    const uniqueRoles = Array.from(new Set(roles.map(r => String(r).toLowerCase().trim())));
    if (uniqueRoles.length === 0) uniqueRoles.push('employee');

    return {
        roles: uniqueRoles,
        permissions: Array.from(new Set(permissions))
    };
}
