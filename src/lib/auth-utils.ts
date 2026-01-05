import { IPosition } from "./models";

export function getAugmentedRolesAndPermissions(employee: any, position?: any) {
    let roles: string[] = [];

    // 1. Direct roles from employee document
    if (employee.roles && employee.roles.length > 0) {
        roles = [...employee.roles];
    } else if (employee.role) { // Legacy fallback
        roles.push(employee.role);
    }

    // 2. Position-based role and permissions
    let permissions: string[] = [];
    if (position) {
        const posName = (position.name || "").toLowerCase();

        // Hardcoded title-to-role mappings (matching existing auth.ts logic)
        if (posName.includes('owner') || posName.includes('partner')) roles.push('owner');
        if (posName.includes('hr')) roles.push('hr');
        if (posName.includes('store manager')) roles.push('store_manager');
        if (posName.includes('department head')) roles.push('department_head');
        if (posName.includes('tech') || posName.includes('developer')) roles.push('tech');

        // Functional Permissions from Position
        if (position.permissions && position.permissions.length > 0) {
            permissions = [...position.permissions];
        }

        // Also check if position has Roles linked directly (IPosition.roles)
        // If they were populated, we could add them.
        if (position.roles && Array.isArray(position.roles)) {
            position.roles.forEach((r: any) => {
                if (typeof r === 'string') roles.push(r);
                else if (r.name) roles.push(r.name);
            });
        }
    }

    // Deduplicate and Normalize
    const uniqueRoles = Array.from(new Set(roles.map(r => String(r).toLowerCase().trim())));
    if (uniqueRoles.length === 0) uniqueRoles.push('employee');

    // Ensure permissions are strings (sometimes Mongoose returns { type: '...' } objects if schema is weirdly defined)
    const normalizedPermissions = permissions.map(p => typeof p === 'string' ? p : (p as any).type || String(p));

    return {
        roles: uniqueRoles,
        permissions: Array.from(new Set(normalizedPermissions))
    };
}
