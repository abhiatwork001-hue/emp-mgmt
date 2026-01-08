import { getNoticesForUser } from "@/lib/actions/notice.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Megaphone, Calendar, Store, Globe, Search } from "lucide-react";
import Link from "next/link";
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { getAllStores, getStoreDepartments } from "@/lib/actions/store.actions";
import { getAllGlobalDepartments } from "@/lib/actions/department.actions";
import { CreateNoticeDialog } from "@/components/notices/create-notice-dialog";
import { EmptyState } from "@/components/ui/empty-state";

export default async function NoticeListPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/");

    const employee = await getEmployeeById((session.user as any).id);
    if (!employee) redirect("/");

    const notices = await getNoticesForUser(employee._id);

    // Determine Role for Dialog
    // Note: This logic duplicates Dashboard slightly but is safe.
    // Ideally we centralize role determination.
    const directRoles = employee.roles || [];
    const positionRoles = employee.positionId?.roles?.map((r: any) => r.name) || [];
    const allRoles = [...new Set([...directRoles, ...positionRoles])].map(r => r.toLowerCase().replace(/ /g, "_"));

    let currentUserRole = "employee";
    if (allRoles.includes("super_user")) currentUserRole = "super_user";
    else if (allRoles.includes("owner")) currentUserRole = "owner";
    else if (allRoles.includes("admin")) currentUserRole = "admin";
    else if (allRoles.includes("hr")) currentUserRole = "hr";
    else if (allRoles.includes("store_manager")) currentUserRole = "store_manager";
    else if (allRoles.includes("department_head")) currentUserRole = "department_head";
    else if (allRoles.includes("store_department_head")) currentUserRole = "store_department_head";

    const stores = await getAllStores();
    const depts = await getAllGlobalDepartments();

    let localStoreDepartments: any[] = [];
    if (currentUserRole === "store_manager") {
        const sId = employee.storeId?._id || employee.storeId;
        if (sId) {
            localStoreDepartments = await getStoreDepartments(sId.toString());
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Company Notices</h1>
                    <p className="text-muted-foreground">
                        Stay updated with the latest announcements and news.
                    </p>
                </div>
                {/* Create Notice Dialog */}
                {["admin", "hr", "owner", "super_user", "store_manager", "department_head", "store_department_head"].includes(currentUserRole) && (
                    <CreateNoticeDialog
                        userId={employee._id}
                        currentUserRole={currentUserRole}
                        storeId={employee.storeId?._id || employee.storeId}
                        storeDepartmentId={employee.storeDepartmentId?._id || employee.storeDepartmentId}
                        globalDepartmentId={employee.storeDepartmentId?.globalDepartmentId}
                        stores={JSON.parse(JSON.stringify(stores))}
                        departments={JSON.parse(JSON.stringify(depts))}
                        storeDepartments={JSON.parse(JSON.stringify(localStoreDepartments))}
                    />
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {notices.map((notice: any) => (
                    <Link href={`/dashboard/notices/${notice._id}`} key={notice._id}>
                        <Card className="h-full hover:bg-accent/50 transition-colors cursor-pointer flex flex-col">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start gap-2">
                                    <Badge
                                        variant={notice.priority === 'urgent' ? 'destructive' : 'outline'}
                                        className="mb-2"
                                    >
                                        {notice.priority === 'urgent' ? 'Urgent' : 'Normal'}
                                    </Badge>
                                    <div className="flex gap-1">
                                        {notice.targetScope === 'global' && <Badge variant="secondary">Global</Badge>}
                                        {notice.targetScope === 'store' && <Badge variant="outline">Store</Badge>}
                                    </div>
                                </div>
                                <CardTitle className="line-clamp-2 leading-tight">
                                    {notice.title}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2 mt-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(notice.createdAt), "MMM d, yyyy")}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-1">
                                <div className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                    {/* Strip HTML tags for preview if needed, or just show text */}
                                    {notice.content.replace(/<[^>]*>?/gm, '')}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-4 border-t">
                                    {notice.createdBy?.image ? (
                                        <img src={notice.createdBy.image} alt="" className="w-5 h-5 rounded-full object-cover" />
                                    ) : (
                                        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                                            {notice.createdBy?.firstName?.[0]}
                                        </div>
                                    )}
                                    <span>Posted by {notice.createdBy?.firstName} {notice.createdBy?.lastName}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}

                {notices.length === 0 && (
                    <div className="col-span-full">
                        <EmptyState
                            title="No Notices Found"
                            description="There are currently no notices to display. Check back later for updates."
                            icon={Megaphone}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
