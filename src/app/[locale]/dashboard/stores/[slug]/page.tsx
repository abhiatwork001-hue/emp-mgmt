import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStoreBySlug } from "@/lib/actions/store.actions";
import { getEmployeesByStore, getStoreEmployeesWithTodayStatus } from "@/lib/actions/employee.actions";
import { getStoreDepartments } from "@/lib/actions/store-department.actions";
import { AddDepartmentDialog } from "@/components/stores/add-department-dialog";
import { AssignEmployeeDialog } from "@/components/stores/assign-employee-dialog";
import { ManageStoreManagersDialog } from "@/components/stores/manage-store-managers-dialog";
import { RemoveStoreEmployeeButton } from "@/components/stores/remove-store-employee-button";
import { StoreEmployeesList } from "@/components/stores/store-employees-list";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit, Trash, Mail, MapPin, Phone, Building2, Users, Calendar as CalendarIcon, Layers, TrendingUp } from "lucide-react";
import { Link } from "@/i18n/routing";
import { StoreDepartmentsListClient } from "@/components/stores/store-departments-list-client";
import { RemoveStoreManagerButton } from "@/components/stores/remove-store-manager-button";
import { CreateScheduleDialog } from "@/components/schedules/create-schedule-dialog";
import { CredentialManager } from "@/components/credentials/credential-list";
import { StoreReviewsWidget } from "@/components/stores/store-reviews-widget";
import { StoreWeatherWidget } from "@/components/stores/store-weather-widget";
import { getStoreWeather } from "@/lib/actions/weather.actions";
import { StoreAnalyticsWidget } from "@/components/dashboard/analytics/store-analytics-widget";
import { StoreSupplierPreferences } from "@/components/stores/store-supplier-preferences";
import { getSuppliers } from "@/lib/actions/supplier.actions";


export default async function StoreDetailsPage({ params }: { params: Promise<{ slug: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const { slug } = await params;
    const store = await getStoreBySlug(slug);

    if (!store) {
        return <div>Store not found</div>;
    }

    const storeId = store._id.toString();
    const currentUser = await import("@/lib/actions/employee.actions").then(m => m.getEmployeeById((session.user as any).id));
    const userRoles = (currentUser?.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));

    // Permission Logic
    const isGlobalAdmin = userRoles.some((r: string) => ["admin", "owner", "super_user", "hr", "tech"].includes(r));
    const isStoreManager = userRoles.includes("store_manager");

    // "employee and storeDepartmentHead should not see the edit store Button"
    // "storeManager... cannot edit employee... or add employee... and manage team"
    const canEditStore = isGlobalAdmin; // Store Managers restricted to View Only

    // "storeManager... cannot assign manager to the store"
    const canManageManagers = isGlobalAdmin;

    // "employee, storeManager and storeDepartmentHead cannot edit employee... or add employee... and manage team"
    const canManageEmployees = isGlobalAdmin;

    // Credentials: "none can add storeCredentials for the store, just the manager... hr, tech, admin, owner"
    // Clarification: Request said "just the manager" BUT later "storeManager... cannot add".
    // "but storeManager, storeDepartmentHead can see... hr, tech, admin and owner can edit and see"
    const canEditCredentials = isGlobalAdmin || isStoreManager; // Tech/Admin/Owner/HR + StoreManager

    const employees = await getStoreEmployeesWithTodayStatus(storeId);
    const storeDepartments = await getStoreDepartments(storeId);

    // Fetch Active Schedules Count
    const { getSchedules } = require("@/lib/actions/schedule.actions");
    const allSchedules = await getSchedules(storeId);
    const activeSchedulesCount = allSchedules.filter((s: any) => s.status === 'published' || s.status === 'active').length;

    // Fetch weather data
    const weatherResult = await getStoreWeather(storeId);
    const weather = weatherResult.success ? weatherResult.weather : null;

    // Fetch Suppliers for preferences
    const suppliers = await getSuppliers(storeId);

    // Calculate rating change from history
    const ratingHistory = store.ratingHistory || [];
    const latestEntry = ratingHistory[ratingHistory.length - 1];
    const ratingChange = latestEntry?.change || 0;

    return (
        <div className="space-y-6">
            {/* Header */}
            {/*             <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/dashboard/stores" className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                            <span>←</span> Back to Stores
                        </Link>
                    </Button>
                </div>
            </div> */}

            {/* Title Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">{store.name}</h2>
                    <p className="text-muted-foreground">Store Profile & Management</p>
                </div>
                <div className="flex items-center gap-2">
                    {canEditStore && (
                        <Button variant="default" asChild>
                            <a href={`/dashboard/stores/${store.slug}/edit`}>
                                <Edit className="mr-2 h-4 w-4" /> Edit Store
                            </a>
                        </Button>
                    )}
                </div>
            </div>

            {/* Main Content Grid - 3 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Store Information (2 cols on large screens) */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Store Information Card */}
                    <Card>
                        <CardHeader className="flex flex-row items-center gap-3 pb-3">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg">
                                <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">Store Information</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-sm font-medium text-muted-foreground">Store Name</span>
                                    <p className="font-semibold">{store.name}</p>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-sm font-medium text-muted-foreground">Manager</span>
                                    <p className="font-semibold">
                                        {store.managers && store.managers.length > 0
                                            ? `${store.managers[0].firstName} ${store.managers[0].lastName}`
                                            : "Not assigned"}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <span className="text-sm font-medium text-muted-foreground">Address</span>
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground" />
                                    <p className="font-medium">{store.address || "N/A"}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <span className="text-sm font-medium text-muted-foreground">Phone</span>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <p className="font-medium">+1 (555) 123-4567</p>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <span className="text-sm font-medium text-muted-foreground">Status</span>
                                    {store.active ? (
                                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">active</Badge>
                                    ) : (
                                        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">inactive</Badge>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Departments Section */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                                    <Layers className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                </div>
                                <CardTitle className="text-lg">Departments</CardTitle>
                            </div>
                            <Link href={`/dashboard/schedules`} className="text-sm text-blue-600 hover:underline flex items-center gap-1">
                                <CalendarIcon className="h-4 w-4" />
                                Show Schedule
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <StoreDepartmentsListClient storeDepartments={storeDepartments} storeSlug={store.slug} storeId={store._id.toString()} canManage={canEditStore} />
                        </CardContent>
                    </Card>

                    {/* Employees Section */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between pb-3">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">Employees</CardTitle>
                                    <p className="text-sm text-muted-foreground">{employees.length} total</p>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <StoreEmployeesList storeId={store._id} employees={employees} canManage={canManageEmployees} departments={storeDepartments} currentUserRoles={userRoles} />
                        </CardContent>
                    </Card>

                    {/* Google Reviews Section */}
                    <StoreReviewsWidget
                        storeId={store._id.toString()}
                        reviews={store.googleReviews}
                        rating={store.googleRating}
                        userRatingsTotal={store.googleUserRatingsTotal}
                        lastUpdated={store.lastReviewsUpdate}
                        ratingChange={ratingChange}
                        googlePlaceId={store.googlePlaceId}
                    />

                    {/* Weather Section */}
                    {weather && (
                        <StoreWeatherWidget
                            weather={weather}
                            storeName={store.name}
                        />
                    )}

                    {/* Credentials Section */}
                    <CredentialManager storeId={store._id.toString()} userId={(session.user as any).id} canEdit={canEditCredentials} />

                    {/* Supplier Preferences Section (Store Managers & Global Admins) */}
                    {(canEditCredentials || isStoreManager) && (
                        <StoreSupplierPreferences
                            storeId={storeId}
                            suppliers={suppliers}
                            storeSettings={store.settings}
                            canEdit={canEditCredentials} // Reuse same permission or stricter? "Store Manager can set preference" -> Yes.
                        />
                    )}

                    {/* Monthly Analytics & History */}
                    <div id="analytics" className="pt-6 border-t">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                                <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <h3 className="text-xl font-bold">Monthly Performance & History</h3>
                        </div>
                        <StoreAnalyticsWidget storeId={store._id.toString()} />
                    </div>
                </div>

                {/* Right Column - Quick Stats & Quick Actions */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-lg">Quick Stats</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {(() => {
                                // --- Calculation Logic ---
                                const { getISOWeekNumber } = require("@/lib/utils");
                                const now = new Date();
                                const currentWeek = getISOWeekNumber(now);
                                const currentYear = now.getFullYear();

                                // 1. Smart Schedule Selection
                                // Prioritize Current Week. If no published schedule, find the next closest future schedule.
                                // If none, fall back to the most recent past schedule.

                                const getScheduleScore = (s: any) => {
                                    if (s.year === currentYear && s.weekNumber === currentWeek) return 1000; // Current week = Top priority
                                    if (s.year === currentYear && s.weekNumber > currentWeek) return 500 - (s.weekNumber - currentWeek); // Future weeks (closer is better)
                                    if (s.year > currentYear) return 400; // Next year
                                    return 100 - (currentWeek - s.weekNumber); // Past weeks (recent is better)
                                };

                                const relevantSchedules = allSchedules
                                    .filter((s: any) => s.status === 'published' || s.status === 'approved')
                                    .sort((a: any, b: any) => getScheduleScore(b) - getScheduleScore(a));

                                const activeSchedule = relevantSchedules[0];
                                // activeSchedule is the SINGLE schedule we will base stats on.
                                // In a store with multiple departments, "one schedule" might technically be split across docs if the system was designed that way,
                                // but typically it's one schedule doc per store per week? 
                                // Actually, based on previous code `publishedSchedules` was a filter returning ARRAY.
                                // If the system supports multiple schedule docs for the same week (e.g. per dept), we need to filter by the *selected week*.

                                let targetYear = currentYear;
                                let targetWeek = currentWeek;

                                if (activeSchedule) {
                                    targetYear = activeSchedule.year;
                                    targetWeek = activeSchedule.weekNumber;
                                }

                                const publishedSchedules = allSchedules.filter((s: any) =>
                                    s.year === targetYear &&
                                    s.weekNumber === targetWeek &&
                                    (s.status === 'published' || s.status === 'approved')
                                );

                                let actualHours = 0;
                                publishedSchedules.forEach((schedule: any) => {
                                    if (schedule.days) {
                                        schedule.days.forEach((day: any) => {
                                            if (day.shifts) {
                                                day.shifts.forEach((shift: any) => {
                                                    const [startH, startM] = shift.startTime.split(':').map(Number);
                                                    const [endH, endM] = shift.endTime.split(':').map(Number);
                                                    let duration = (endH * 60 + endM) - (startH * 60 + startM);
                                                    if (duration < 0) duration += 24 * 60; // Overnight

                                                    // Deduct break
                                                    if (shift.breakMinutes) duration -= shift.breakMinutes;

                                                    // Multiply by headcount
                                                    const headcount = shift.employees ? shift.employees.length : 0;
                                                    actualHours += (duration / 60) * headcount;
                                                });
                                            }
                                        });
                                    }
                                });

                                // 2. Targets
                                const targetHours = (store as any).targetWeeklyHours || 0;
                                const minStaff = (store as any).minEmployees || 0;
                                const maxStaff = (store as any).maxEmployees || 0;
                                const currentStaff = employees?.length || 0;

                                return (
                                    <div className="space-y-4">
                                        {/* Staffing */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-muted-foreground">Staffing</span>
                                                <span className={`text-sm font-bold ${currentStaff < minStaff ? 'text-red-500' : 'text-foreground'}`}>
                                                    {currentStaff} Active
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                <span>Target Range:</span>
                                                <span>{minStaff > 0 || maxStaff > 0 ? `${minStaff} - ${maxStaff || 'Any'}` : 'Not set'}</span>
                                            </div>
                                            {/* Mini Progress Bar for Staffing */}
                                            {(minStaff > 0 && maxStaff > 0) && (
                                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1 mb-2">
                                                    <div
                                                        className={`h-full rounded-full ${currentStaff < minStaff ? 'bg-red-500' : (currentStaff > maxStaff ? 'bg-yellow-500' : 'bg-emerald-500')}`}
                                                        style={{ width: `${Math.min((currentStaff / maxStaff) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            )}

                                            {/* Dept Staffing Breakdown */}
                                            {storeDepartments.length > 0 && (
                                                <div className="space-y-2 pt-2 border-t border-border/30 max-h-40 overflow-y-auto pr-1">
                                                    {storeDepartments.map((dept: any) => {
                                                        const deptEmployees = employees?.filter((e: any) =>
                                                            e.storeDepartmentId?._id === dept._id || e.storeDepartmentId === dept._id
                                                        ).length || 0;

                                                        const minD = dept.minEmployees || 0;
                                                        const maxD = dept.maxEmployees || 0;
                                                        const hasTarget = minD > 0 || maxD > 0;

                                                        return (
                                                            <div key={dept._id} className="text-xs flex justify-between items-center">
                                                                <span className="truncate max-w-[120px]" title={dept.name}>{dept.name}</span>
                                                                <span className={`${hasTarget && (deptEmployees < minD || (maxD > 0 && deptEmployees > maxD)) ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
                                                                    {deptEmployees} {hasTarget ? <span className="text-[10px] text-muted-foreground font-normal">/ {minD}-{maxD || '∞'}</span> : ''}
                                                                </span>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="h-px bg-border/50" />

                                        {/* Hours */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                                    Weekly Hours
                                                    {activeSchedule && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                            W{targetWeek}
                                                        </span>
                                                    )}
                                                </span>
                                                <div className="text-right">
                                                    <span className="text-sm font-bold block">{actualHours.toFixed(1)} h</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                <span>Target:</span>
                                                <span>{targetHours > 0 ? `${targetHours} h` : 'Not set'}</span>
                                            </div>
                                            {/* Mini Progress Bar for Hours */}
                                            {targetHours > 0 && (
                                                <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden mt-1 mb-2">
                                                    <div
                                                        className={`h-full rounded-full ${actualHours > targetHours ? 'bg-red-500' : 'bg-blue-500'}`}
                                                        style={{ width: `${Math.min((actualHours / targetHours) * 100, 100)}%` }}
                                                    />
                                                </div>
                                            )}

                                            {/* Department Hours Breakdown - Moved inside Hours section */}
                                            {storeDepartments.length > 0 && (
                                                <div className="space-y-2 pt-2 border-t border-border/30 max-h-40 overflow-y-auto pr-1">
                                                    {storeDepartments.map((dept: any) => {
                                                        // Calc hours for this dept
                                                        let deptActualHours = 0;
                                                        const deptSchedule = publishedSchedules.find((s: any) =>
                                                            s.storeDepartmentId?._id === dept._id || s.storeDepartmentId === dept._id
                                                        );

                                                        if (deptSchedule && deptSchedule.days) {
                                                            deptSchedule.days.forEach((day: any) => {
                                                                if (day.shifts) {
                                                                    day.shifts.forEach((shift: any) => {
                                                                        const [startH, startM] = shift.startTime.split(':').map(Number);
                                                                        const [endH, endM] = shift.endTime.split(':').map(Number);
                                                                        let duration = (endH * 60 + endM) - (startH * 60 + startM);
                                                                        if (duration < 0) duration += 24 * 60;
                                                                        if (shift.breakMinutes) duration -= shift.breakMinutes;
                                                                        const headcount = shift.employees ? shift.employees.length : 0;
                                                                        deptActualHours += (duration / 60) * headcount;
                                                                    });
                                                                }
                                                            });
                                                        }

                                                        const deptTarget = dept.targetWeeklyHours || 0;

                                                        return (
                                                            <div key={dept._id} className="text-xs">
                                                                <div className="flex justify-between items-center mb-1">
                                                                    <span className="truncate max-w-[120px]" title={dept.name}>{dept.name}</span>
                                                                    <span className={deptTarget > 0 && deptActualHours > deptTarget ? "text-red-500 font-bold" : "text-muted-foreground"}>
                                                                        {deptActualHours.toFixed(0)} <span className="text-[10px] font-normal text-muted-foreground">/ {deptTarget > 0 ? deptTarget : '-'} h</span>
                                                                    </span>
                                                                </div>
                                                                {deptTarget > 0 && (
                                                                    <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                                                        <div
                                                                            className={`h-full rounded-full ${deptActualHours > deptTarget ? 'bg-red-500' : 'bg-blue-500'}`}
                                                                            style={{ width: `${Math.min((deptActualHours / deptTarget) * 100, 100)}%` }}
                                                                        />
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className="h-px bg-border/50" />

                                        {/* General Stats - Compact at bottom */}
                                        <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                                            <div className="p-1.5 bg-muted/30 rounded">
                                                <span className="block text-lg font-bold">{storeDepartments.length}</span>
                                                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Depts</span>
                                            </div>
                                            <div className="p-1.5 bg-muted/30 rounded">
                                                <span className="block text-lg font-bold">{activeSchedulesCount}</span>
                                                <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Total Scheds</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </CardContent>
                    </Card>



                    {/* Management Card */}
                    {canManageManagers && (
                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">Management</CardTitle>
                                    <ManageStoreManagersDialog
                                        storeId={store._id}
                                        storeName={store.name}
                                        managers={store.managers || []}
                                        subManagers={store.subManagers || []}
                                    />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Store Managers */}
                                <div className="space-y-2">
                                    <span className="text-xs text-muted-foreground uppercase font-semibold">Store Manager</span>
                                    {store.managers && store.managers.length > 0 ? (
                                        <div className="space-y-2">
                                            {store.managers.map((manager: any) => (
                                                <div key={manager._id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold overflow-hidden border">
                                                        {manager.image ? (
                                                            <img src={manager.image} alt={manager.firstName} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span>{manager.firstName?.[0]}{manager.lastName?.[0]}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{manager.firstName} {manager.lastName}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{manager.email}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-xs text-muted-foreground italic py-2">No manager assigned</p>
                                    )}
                                </div>

                                {/* Sub-Managers */}
                                {store.subManagers && store.subManagers.length > 0 && (
                                    <div className="space-y-2 pt-2 border-t">
                                        <span className="text-xs text-muted-foreground uppercase font-semibold">Sub-Managers</span>
                                        <div className="space-y-2">
                                            {store.subManagers.map((subManager: any) => (
                                                <div key={subManager._id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                                                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold overflow-hidden border">
                                                        {subManager.image ? (
                                                            <img src={subManager.image} alt={subManager.firstName} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span>{subManager.firstName?.[0]}{subManager.lastName?.[0]}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{subManager.firstName} {subManager.lastName}</p>
                                                        <p className="text-xs text-muted-foreground truncate">{subManager.email}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* Remove Tabs Section - content is now integrated above */}
        </div >
    );
}
