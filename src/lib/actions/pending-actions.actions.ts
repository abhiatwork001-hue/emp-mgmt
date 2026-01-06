"use server";

import dbConnect from "@/lib/db";
import {
    VacationRequest,
    AbsenceRequest,
    OvertimeRequest,
    Schedule,
    Employee
} from "@/lib/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAugmentedRolesAndPermissions } from "../auth-utils";

export async function getPendingActions() {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    const userId = session.user.id;
    const userRoles = (session.user as any).roles || [];

    // 1. My Own Pending Requests
    const myVacations = await VacationRequest.find({ employeeId: userId, status: 'pending' }).lean();
    const myAbsences = await AbsenceRequest.find({ employeeId: userId, status: 'pending' }).lean();
    const myOvertime = await OvertimeRequest.find({ employeeId: userId, status: 'pending' }).lean();

    // 2. Approvals (for Managers)
    const isApprover = userRoles.some((r: string) =>
        ["owner", "hr", "admin", "super_user", "tech", "store_manager"].includes(r.toLowerCase())
    );

    let approvals: any = {
        vacations: [],
        absences: [],
        overtime: [],
        schedules: []
    };

    if (isApprover) {
        // More complex logic: HR/Admin see everything, Store Managers see their store
        const isGlobalApprover = userRoles.some((r: string) =>
            ["owner", "hr", "admin", "super_user", "tech"].includes(r.toLowerCase())
        );

        let query: any = { status: 'pending' };

        if (!isGlobalApprover) {
            // Filter by store - need to find employee store context
            const manager = await Employee.findById(userId).select("storeId");
            if (manager?.storeId) {
                const employeesInStore = await Employee.find({ storeId: manager.storeId }).select("_id");
                const empIds = employeesInStore.map(e => e._id);
                query.employeeId = { $in: empIds };
            }
        }

        const [pendingVacations, pendingAbsences, pendingOvertime] = await Promise.all([
            VacationRequest.find(query).populate('employeeId', 'firstName lastName').sort({ createdAt: 1 }).lean(),
            AbsenceRequest.find(query).populate('employeeId', 'firstName lastName').sort({ createdAt: 1 }).lean(),
            OvertimeRequest.find(query).populate('employeeId', 'firstName lastName').sort({ createdAt: 1 }).lean()
        ]);

        approvals.vacations = pendingVacations;
        approvals.absences = pendingAbsences;
        approvals.overtime = pendingOvertime;

        // Schedules check
        if (isGlobalApprover) {
            approvals.schedules = await Schedule.find({ status: 'draft' })
                .populate('storeId', 'name')
                .populate('storeDepartmentId', 'name')
                .lean();
        } else {
            const manager = await Employee.findById(userId).select("storeId");
            if (manager?.storeId) {
                approvals.schedules = await Schedule.find({ storeId: manager.storeId, status: 'draft' })
                    .populate('storeId', 'name')
                    .populate('storeDepartmentId', 'name')
                    .lean();
            }
        }
    }

    return {
        myActions: {
            vacations: JSON.parse(JSON.stringify(myVacations)),
            absences: JSON.parse(JSON.stringify(myAbsences)),
            overtime: JSON.parse(JSON.stringify(myOvertime))
        },
        approvals: JSON.parse(JSON.stringify(approvals))
    };
}
