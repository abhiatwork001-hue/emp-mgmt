import { getNoticeById } from "@/lib/actions/notice.actions";
import { getEmployeeById } from "@/lib/actions/employee.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, Calendar, User, Globe, Store, Pencil } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CommentSection } from "@/components/notices/comment-section";
import { CreateNoticeDialog } from "@/components/notices/create-notice-dialog";

export default async function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/");

    const { id } = await params;
    const notice = await getNoticeById(id);
    if (!notice) notFound();

    const currentUserId = (session.user as any).id;
    const currentUser = await getEmployeeById(currentUserId);

    const userRoles = (currentUser.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const primaryRole = userRoles.includes("owner") ? "owner" :
        userRoles.includes("admin") ? "admin" :
            userRoles.includes("hr") ? "hr" :
                userRoles.includes("super_user") ? "super_user" :
                    userRoles.includes("store_manager") ? "store_manager" :
                        "employee";

    const creatorId = notice.createdBy?._id?.toString() || notice.createdBy?.toString();
    const isCreator = creatorId === currentUserId;
    const canEdit = isCreator || ["admin", "owner", "super_user"].includes(primaryRole);

    // Fetch lists for Edit Form
    let stores = [];
    let departments = [];
    let storeDepartments = [];

    if (["owner", "super_user", "admin", "hr"].includes(primaryRole)) {
        const { getAllStores } = await import("@/lib/actions/store.actions");
        const { getAllGlobalDepartments } = await import("@/lib/actions/department.actions");
        stores = await getAllStores();
        departments = await getAllGlobalDepartments();
    }

    if (primaryRole === "store_manager" && currentUser.storeId) {
        const { getStoreDepartments } = await import("@/lib/actions/store.actions");
        const sId = currentUser.storeId._id ? currentUser.storeId._id.toString() : currentUser.storeId.toString();
        storeDepartments = await getStoreDepartments(sId);
    }

    const cStoreId = currentUser.storeId ? (currentUser.storeId._id ? currentUser.storeId._id.toString() : currentUser.storeId.toString()) : undefined;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <div className="flex items-center justify-between mb-4">
                    <Link href="/dashboard/notices">
                        <Button variant="ghost" className="pl-0 gap-2 hover:bg-transparent hover:text-primary">
                            <ChevronLeft className="h-4 w-4" />
                            Back to Notices
                        </Button>
                    </Link>

                    {canEdit && (
                        <CreateNoticeDialog
                            userId={currentUserId}
                            currentUserRole={primaryRole}
                            storeId={cStoreId}
                            stores={stores}
                            departments={departments}
                            storeDepartments={storeDepartments}
                            mode="edit"
                            initialData={notice}
                            trigger={
                                <Button variant="outline" size="sm" className="gap-2">
                                    <Pencil className="h-4 w-4" />
                                    Edit Notice
                                </Button>
                            }
                        />
                    )}
                </div>

                <div className="bg-card w-full rounded-xl border shadow-sm p-6 sm:p-8">
                    <div className="flex flex-col gap-4">
                        <div className="flex gap-2 mb-2">
                            {notice.targetScope === 'global' && <Badge variant="secondary" className="gap-1"><Globe className="h-3 w-3" /> Global</Badge>}
                            {notice.targetScope === 'store' && <Badge variant="outline" className="gap-1"><Store className="h-3 w-3" /> Store</Badge>}
                            {notice.priority === 'urgent' && <Badge variant="destructive">Urgent</Badge>}
                            {notice.expiresAt && <Badge variant="outline" className="text-orange-600 border-orange-200">Expires {format(new Date(notice.expiresAt), "MMM d")}</Badge>}
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                            {notice.title}
                        </h1>

                        <div className="flex items-center gap-4 text-sm text-muted-foreground pb-6 border-b">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4" />
                                <span>{notice.createdBy?.firstName} {notice.createdBy?.lastName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4" />
                                <span>{format(new Date(notice.createdAt), "MMMM do, yyyy")}</span>
                            </div>
                        </div>

                        <div
                            className="prose prose-sm sm:prose-base dark:prose-invert max-w-none pt-4 pb-8"
                            dangerouslySetInnerHTML={{ __html: notice.content }}
                        />

                        {notice.attachments && notice.attachments.length > 0 && (
                            <div className="border-t pt-4">
                                <h4 className="text-sm font-semibold mb-2">Attachments</h4>
                                <div className="flex gap-2">
                                    {notice.attachments.map((att: string, i: number) => (
                                        <div key={i} className="text-sm bg-muted px-3 py-1 rounded">{att}</div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <CommentSection
                    noticeId={notice._id}
                    userId={currentUserId}
                    comments={notice.comments || []}
                />
            </div>
        </div>
    );
}
