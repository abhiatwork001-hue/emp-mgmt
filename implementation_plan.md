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

### 4. Restrictions  - [ ] Consolidate Dashboard Widgets (Tasks + Approvals)
  - [ ] Fix Schedule "Total Hours" Calculation
  - [ ] Update Recipe Food Cost Permissions
  - [ ] Support Store Redirect in Schedule Page

  ## User Review Required
  > [!IMPORTANT]
  > **Permissions Update**: "Admin" role will be granted access to view Food Cost in Recipe Details, previously excluded.
  
  > [!NOTE]
  > **Dashboard Layout**: The split grid for Tasks and Approvals will be replaced by a unified "Action Center" (Tasks/Approvals) widget to improve layout on role dashboards.

### Dashboard UI
#### [MODIFY] [store-manager-dashboard.tsx](file:///Users/abhisheksharma/Desktop/Projects/google%20antigravity/chick%20main/src/components/dashboard/role-views/store-manager-dashboard.tsx)
- Consolidate `TaskBoard` and `PendingApprovalsWidget` into a single container or tabs.
- Ensure full width usage for better visibility.

### Schedule Management
#### [MODIFY] [schedule.actions.ts](file:///Users/abhisheksharma/Desktop/Projects/google%20antigravity/chick%20main/src/lib/actions/schedule.actions.ts)
- Fix time difference calculation (manual hh:mm parsing).
- Deduct `breakMinutes` in `getDashboardData`.
- Ensure `getEmployeeWorkHistory` correctly parses times and handles empty scenarios.

#### [MODIFY] [page.tsx (Schedules)](file:///Users/abhisheksharma/Desktop/Projects/google%20antigravity/chick%20main/src/app/[locale]/dashboard/schedules/page.tsx)
- Add `searchParams` support to read `storeId`.
- Prioritize `storeId` param for filtering if present.

### Recipe Management
#### [MODIFY] [recipe.actions.ts](file:///Users/abhisheksharma/Desktop/Projects/google%20antigravity/chick%20main/src/lib/actions/recipe.actions.ts)
- Update `checkFinancialAccess` to include `admin` role.

### Seed Data
#### [COMPLETED] [seed/steps/*.ts](file:///Users/abhisheksharma/Desktop/Projects/google%20antigravity/chick%20main/seed/steps/06-employees.ts)
- 1000 employees, 50 stores.
- Eduardo Sotelo as Global Kitchen Head.
- Vacation/Absence scenarios (Today/Tomorrow/Next Week).
2.  **Create Global Depts**: Kitchen, Service, Bar, Management.
3.  **Create Stores**: Store A - E.
4.  **Create Store Depts**: Link Global Depts to Stores.
5.  **Create Positions**: Chef, Server, Manager, etc.
6.  **Create Employees**:
    *   Loop to create Staff, Managers, Heads.
7.  **Generate History**:
    *   Create Schedules for past/future weeks.
    *   Create Vacation/Absence records.

## Verification
1.  **RBAC**: Log in as each role (using `testRole` or real users) and verify Dashboard permissions and Sidebar links.
2.  **Seed**: Check DB counts and UI population.
