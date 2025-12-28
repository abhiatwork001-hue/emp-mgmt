export const PERMISSIONS = {
    // Stores
    CREATE_STORE: "create_store",
    EDIT_STORE: "edit_store",
    DELETE_STORE: "delete_store",
    MANAGE_STORE: "manage_store", // General management view

    // Global Departments
    CREATE_DEPARTMENT: "create_department",
    EDIT_DEPARTMENT: "edit_department",
    DELETE_DEPARTMENT: "delete_department",
    MANAGE_DEPARTMENT: "manage_department",

    // Store Departments
    CREATE_STORE_DEPARTMENT: "create_storeDepartment",
    EDIT_STORE_DEPARTMENT: "edit_storeDepartment",
    DELETE_STORE_DEPARTMENT: "delete_storeDepartment",
    MANAGE_STORE_DEPARTMENT: "manage_storeDepartment",
    MANAGE_STORE_DEPARTMENT_EMPLOYEE: "manage_storeDepartmentEmployee",

    // Employees
    CREATE_EMPLOYEE: "create_employee",
    EDIT_EMPLOYEE: "edit_employee",
    DELETE_EMPLOYEE: "delete_employee",
    ASSIGN_EMPLOYEE_TO_STORE: "assign_employee_to_store",
    ASSIGN_EMPLOYEE_TO_STORE_DEPARTMENT: "assign_employee_to_storeDepartment",

    // Organization / Structural
    ASSIGN_DEPARTMENT_TO_STORE: "assign_department_to_store",

    // Schedules
    CREATE_SCHEDULE: "create_schedule",
    REVIEW_SCHEDULE: "review_schedule", // Approve/Reject

    // System / SuperUser
    VIEW_LOGS: "view_logs",
    MANAGE_SYSTEM: "manage_system",
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

export const ROLE_DEFINITIONS = {
    SUPER_USER: {
        name: "Super User",
        description: "IT Support and Debugging. Full Access.",
        permissions: Object.values(PERMISSIONS)
    },
    OWNER: {
        name: "Owner",
        description: "Business Owner. Full Access.",
        permissions: Object.values(PERMISSIONS)
    },
    ADMIN: {
        name: "Admin",
        description: "Administrator. Can manage structure but limited deletion.",
        permissions: Object.values(PERMISSIONS).filter(p => !["view_logs"].includes(p)) // Example restriction
    },
    HR: {
        name: "HR",
        description: "Human Resources. Manage employees, schedules, vacations. Cannot delete structures.",
        permissions: [
            PERMISSIONS.EDIT_STORE,
            PERMISSIONS.EDIT_DEPARTMENT,
            PERMISSIONS.EDIT_STORE_DEPARTMENT,
            PERMISSIONS.CREATE_EMPLOYEE,
            PERMISSIONS.EDIT_EMPLOYEE,
            PERMISSIONS.ASSIGN_EMPLOYEE_TO_STORE,
            PERMISSIONS.ASSIGN_EMPLOYEE_TO_STORE_DEPARTMENT,
            PERMISSIONS.ASSIGN_DEPARTMENT_TO_STORE,
            PERMISSIONS.CREATE_SCHEDULE,
            PERMISSIONS.REVIEW_SCHEDULE,
            PERMISSIONS.MANAGE_STORE_DEPARTMENT_EMPLOYEE,
            PERMISSIONS.MANAGE_DEPARTMENT,
            PERMISSIONS.MANAGE_STORE
        ]
    },
    STORE_MANAGER: {
        name: "Store Manager",
        description: "Manages a specific store and all its departments.",
        permissions: [
            PERMISSIONS.MANAGE_STORE,
            PERMISSIONS.MANAGE_STORE_DEPARTMENT,
            PERMISSIONS.MANAGE_STORE_DEPARTMENT_EMPLOYEE,
            PERMISSIONS.CREATE_SCHEDULE,
            PERMISSIONS.REVIEW_SCHEDULE, // Can review dept head schedules
            PERMISSIONS.EDIT_STORE_DEPARTMENT // Maybe edit settings?
        ]
    },
    DEPARTMENT_HEAD: {
        name: "Department Head",
        description: "Head of a Global Department. Scope across all stores.",
        permissions: [
            PERMISSIONS.MANAGE_DEPARTMENT,
            PERMISSIONS.MANAGE_STORE_DEPARTMENT, // In their dept
            PERMISSIONS.CREATE_SCHEDULE // For their dept
        ]
    },
    STORE_DEPARTMENT_HEAD: {
        name: "Store Department Head",
        description: "Head of a Department within a specific Store.",
        permissions: [
            PERMISSIONS.MANAGE_STORE_DEPARTMENT,
            PERMISSIONS.MANAGE_STORE_DEPARTMENT_EMPLOYEE,
            PERMISSIONS.CREATE_SCHEDULE
        ]
    },
    EMPLOYEE: {
        name: "Employee",
        description: "Standard employee.",
        permissions: [] // Basic access is implied by authentication, not explicit permission keys usually
    }
};
