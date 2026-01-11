"use server";

import dbConnect from "../db";
import { Employee, Task, Problem, AbsenceRecord } from "../models";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";

export interface IDocumentResult {
    id: string; // The ID of the parent object (Task ID, Employee ID, etc.)
    sourceType: 'task' | 'problem' | 'absence' | 'employee_profile';
    url: string;
    fileName: string; // Or inferred from context
    submittedBy: {
        id: string;
        name: string;
        image?: string;
    };
    submittedAt: Date;
    title: string; // Context title (Task Title, Problem Title)
    description?: string; // e.g. "Asked by John Doe"
    storeId?: string;
}

export async function getAllDocuments(
    query?: string,
    filters?: {
        type?: string; // 'task', 'problem', etc.
        storeId?: string;
        employeeId?: string;
        dateFrom?: Date;
        dateTo?: Date;
    },
    page: number = 1,
    limit: number = 20
) {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    const user = session.user as any;
    const isGlobal = user.roles.includes('owner') || user.roles.includes('admin') || user.roles.includes('hr');
    const isManager = user.roles.includes('store_manager');

    // Scoping
    const storeQuery = (isGlobal) ? {} : (isManager && user.storeId) ? { storeId: user.storeId } : null;
    if (!storeQuery && !isGlobal && !isManager) return []; // Regular employees only see their own? For now restrict to admins/managers.

    // 1. Fetch Employees (Profile Documents)
    const empQuery: any = { documents: { $exists: true, $not: { $size: 0 } } };
    if (filters?.storeId) empQuery.storeId = filters.storeId;
    else if (!isGlobal) empQuery.storeId = user.storeId;
    if (filters?.employeeId) empQuery._id = filters.employeeId;
    if (filters?.type && filters.type !== 'employee_profile') delete empQuery.documents; // Skip if filtering other type

    // Use Promise.all for parallel fetching
    const [employees, tasks, problems, absences] = await Promise.all([
        // Employees
        (!filters?.type || filters.type === 'employee_profile')
            ? Employee.find(empQuery).select('firstName lastName image documents storeId').lean()
            : [],

        // Tasks
        (!filters?.type || filters.type === 'task')
            ? Task.find({
                requiresSubmission: true,
                "submissions.0": { $exists: true }
                // Note: Task scoping is complex (assignedTo). We'll filter in memory or basics.
                // ideally we filter by assignedTo store.. but for now let's fetch and filter.
            }).populate('createdBy', 'firstName lastName').populate('submissions.userId', 'firstName lastName image').lean()
            : [],

        // Problems
        (!filters?.type || filters.type === 'problem')
            ? Problem.find({
                "comments.files.0": { $exists: true },
                ...(storeQuery || {})
            }).populate('comments.userId', 'firstName lastName image').lean()
            : [],

        // Absences
        (!filters?.type || filters.type === 'absence')
            ? AbsenceRecord.find({
                "attachments.0": { $exists: true }
            }).populate('employeeId', 'firstName lastName image storeId').lean()
            : []
    ]);

    let results: IDocumentResult[] = [];

    // --- Normalize Employees ---
    employees.forEach((emp: any) => {
        if (emp.documents) {
            emp.documents.forEach((doc: any) => {
                results.push({
                    id: emp._id.toString(),
                    sourceType: 'employee_profile',
                    url: doc.value,
                    fileName: doc.type || "Document",
                    submittedBy: {
                        id: emp._id.toString(),
                        name: `${emp.firstName} ${emp.lastName}`,
                        image: emp.image
                    },
                    submittedAt: doc.validity || emp.updatedAt, // Approximate
                    title: "Employee Document",
                    description: `Type: ${doc.type}`,
                    storeId: emp.storeId?.toString()
                });
            });
        }
    });

    // --- Normalize Tasks ---
    tasks.forEach((task: any) => {
        if (task.submissions) {
            task.submissions.forEach((sub: any) => {
                if (!sub.fileUrl) return;
                results.push({
                    id: task._id.toString(),
                    sourceType: 'task',
                    url: sub.fileUrl,
                    fileName: sub.fileName || sub.requirementName || "Task Submission",
                    submittedBy: {
                        id: sub.userId?._id?.toString() || sub.userId?.toString(),
                        name: sub.userId ? `${sub.userId.firstName} ${sub.userId.lastName}` : "Unknown",
                        image: sub.userId?.image
                    },
                    submittedAt: sub.submittedAt,
                    title: task.title,
                    description: `Requested by ${task.createdBy?.firstName} ${task.createdBy?.lastName}`,
                    storeId: "various" // Tasks can be global
                });
            });
        }
    });

    // --- Normalize Problems ---
    problems.forEach((prob: any) => {
        if (prob.comments) {
            prob.comments.forEach((comment: any) => {
                if (comment.files && comment.files.length > 0) {
                    comment.files.forEach((file: string, idx: number) => {
                        results.push({
                            id: prob._id.toString(),
                            sourceType: 'problem',
                            url: file,
                            fileName: `Attachment ${idx + 1}`,
                            submittedBy: {
                                id: comment.userId?._id?.toString(),
                                name: comment.userId ? `${comment.userId.firstName} ${comment.userId.lastName}` : comment.userName,
                                image: comment.userId?.image || comment.userImage
                            },
                            submittedAt: comment.createdAt,
                            title: `Problem: ${prob.title}`,
                            description: "Comment Attachment",
                            storeId: prob.storeId?.toString()
                        });
                    });
                }
            });
        }
    });

    // --- Normalize Absences ---
    absences.forEach((abs: any) => {
        if (abs.attachments) {
            abs.attachments.forEach((file: string, idx: number) => {
                // Scope check for absence (storeId on employee)
                // Filter if storeId provided
                if (storeQuery && storeQuery.storeId && abs.employeeId?.storeId?.toString() !== storeQuery.storeId) return;

                results.push({
                    id: abs._id.toString(),
                    sourceType: 'absence',
                    url: file,
                    fileName: "Medical/Absence Proof",
                    submittedBy: {
                        id: abs.employeeId?._id?.toString(),
                        name: abs.employeeId ? `${abs.employeeId.firstName} ${abs.employeeId.lastName}` : "Unknown",
                        image: abs.employeeId?.image
                    },
                    submittedAt: abs.createdAt,
                    title: `Absence: ${abs.type || 'Sick Leave'}`,
                    description: abs.reason,
                    storeId: abs.employeeId?.storeId?.toString()
                });
            });
        }
    });

    // --- Global Filtering & Searching ---
    // 1. Keyword Search
    if (query) {
        const lowerQ = query.toLowerCase();
        results = results.filter(doc =>
            doc.title.toLowerCase().includes(lowerQ) ||
            doc.fileName.toLowerCase().includes(lowerQ) ||
            doc.submittedBy.name.toLowerCase().includes(lowerQ) ||
            doc.description?.toLowerCase().includes(lowerQ)
        );
    }

    // 2. Date Filter
    if (filters?.dateFrom) {
        results = results.filter(doc => new Date(doc.submittedAt) >= filters.dateFrom!);
    }
    if (filters?.dateTo) {
        results = results.filter(doc => new Date(doc.submittedAt) <= filters.dateTo!);
    }

    // 3. Employee Filter
    if (filters?.employeeId) {
        results = results.filter(doc => doc.submittedBy.id === filters.employeeId);
    }

    // 4. Store Filter (Post-fetch for mixed types)
    if (filters?.storeId) {
        results = results.filter(doc => doc.storeId === filters.storeId || doc.storeId === "various");
    }

    // Sorting
    results.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());

    // Pagination
    // Note: This is simulated pagination since we aggregated in memory. 
    // Real DB pagination with unions is hard in Mongo without lookup pipelines. 
    // For < 10k docs this is fine.
    const total = results.length;
    const paginated = results.slice((page - 1) * limit, page * limit);

    return JSON.parse(JSON.stringify({
        data: paginated,
        total,
        page,
        totalPages: Math.ceil(total / limit)
    }));
}
