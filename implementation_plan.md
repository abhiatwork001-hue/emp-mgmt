# RBAC & Seeding Implementation Plan

## Goal
Implement strict Role-Based Access Control (RBAC) for Dashboards and Sidebars, followed by a complete database wipe and re-seed with a large dataset.

## Part 1: Role-Based Access Control (RBAC)

### 1. Dashboard Routing (`src/app/[locale]/dashboard/page.tsx`)
Refine logic to route to specific dashboards:
*   **Employee**: `EmployeeDashboard`
*   **Store Dept Head**: New `StoreDeptHeadDashboard` (or heavily customized `DepartmentHeadDashboard`).
*   **Store Manager**: `StoreManagerDashboard`
*   **Department Head**: `DepartmentHeadDashboard` (Global scope)
*   **HR/Owner/Admin**: `AdminDashboard` or `StoreManagerDashboard` with "All Access".

### 2. Sidebar Navigation (`src/components/layout/sidebar.tsx`)
Update `roleAccess` object to strictly enforce:
*   **Employee**: Home, Store, Profile, Recipe (if Kitchen).
*   **Store Dept Head**: Same + limited management tools.
*   **Store Manager**: Same + Store-wide management.
*   **Dept Head**: Same + Global Dept management.
*   **HR/Admin**: All Access.

### 3. Dashboard Views (`src/components/dashboard/role-views/`)
*   **`StoreDepartmentHeadDashboard`**: Create/Refine.
    *   *Stats*: Shifts, Vacation, Absences for *their* dept.
    *   *Links*: "View Full Schedule" (linked to their StoreDept).
    *   *Tools*: Create Notice (StoreDept scope only).
*   **`StoreManagerDashboard`**: Refine.
    *   *Stats*: Store-wide.
    *   *Tools*: Create Notice (Store-wide).
*   **`DepartmentHeadDashboard`**: Refine.
    *   *Stats*: Global aggregate for their department type.
    *   *Tools*: Create Notice (Global Dept scope).

### 4. Restrictions (Server Actions & UI)
*   **Notices**: `createNotice` action must check user role and scope (Store vs StoreDept).
*   **Schedules**: `getSchedule` must authorize based on Store/Dept.

## Part 2: Database Seeding (`scripts/seed-v2.ts`)

### Goal
Wipe DB and create:
*   5 Stores, 4 Departments (Kitchen, FOH, Bar, Management).
*   80 Employees total.
*   Roles: Store Managers, Store Dept Heads, Global Dept Heads, HR, Owner, Tech.
*   Naming: `storeAemployee1`, `storeAManager1`, etc.
*   History: Past schedules, vacations, absences.

### Script Logic
1.  **Clean**: `deleteMany({})` for all collections.
2.  **Create Global Depts**: Kitchen, Service, Bar, Management.
3.  **Create Stores**: Store A - E.
4.  **Create Store Depts**: Link Global Depts to Stores.
5.  **Create Positions**: Chef, Server, Manager, etc.
6.  **Create Employees**:
    *   Loop to create Staff, Managers, Heads.
    *   Assign Roles & Passwords.
7.  **Generate History**:
    *   Create Schedules for past/future weeks.
    *   Create Vacation/Absence records.

## Verification
1.  **RBAC**: Log in as each role (using `testRole` or real users) and verify Dashboard permissions and Sidebar links.
2.  **Seed**: Check DB counts and UI population.
