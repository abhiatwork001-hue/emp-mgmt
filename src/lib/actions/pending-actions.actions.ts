"use server";

import dbConnect from "@/lib/db";
import {
    VacationRequest,
    AbsenceRequest,
    OvertimeRequest,
    Schedule,
    ShiftCoverageRequest,
    ShiftSwapRequest,
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
    const myCoverage = await ShiftCoverageRequest.find({
        originalEmployeeId: userId,
        status: { $in: ['pending_hr', 'seeking_coverage'] }
    })
        .populate({
            path: 'originalShift.storeId',
            select: 'name'
        })
        .populate({
            path: 'originalShift.storeDepartmentId',
            select: 'name'
        })
        .lean();

    // 1b. Coverage Offers (Available to me) - with full details
    // Exclude requests where I am the original employee (can't accept my own request)
    const requests = await ShiftCoverageRequest.find({
        status: 'seeking_coverage',
        candidates: userId,
        originalEmployeeId: { $ne: userId } // Exclude my own requests
    })
        .populate('originalEmployeeId', 'firstName lastName image')
        .populate({
            path: 'originalShift.storeId',
            select: 'name'
        })
        .populate({
            path: 'originalShift.storeDepartmentId',
            select: 'name'
        })
        .lean();

    // Fetch coworkers for each coverage offer
    const availableCoverage = await Promise.all(requests.map(async (req: any) => {
        const schedule = await Schedule.findById(req.originalShift.scheduleId)
            .populate({
                path: 'days.shifts.employees',
                select: 'firstName lastName'
            })
            .lean();

        let coworkers: any[] = [];
        if (schedule) {
            const dayStart = new Date(req.originalShift.dayDate).setUTCHours(0, 0, 0, 0);
            const day = schedule.days.find((d: any) => new Date(d.date).getTime() === dayStart);
            if (day) {
                const shift = day.shifts.find((s: any) =>
                    s.startTime === req.originalShift.startTime &&
                    s.endTime === req.originalShift.endTime
                );
                if (shift) {
                    coworkers = shift.employees
                        .filter((e: any) => e._id.toString() !== req.originalEmployeeId._id.toString())
                        .map((e: any) => `${e.firstName} ${e.lastName}`);
                }
            }
        }
        return { ...req, coworkers };
    }));

    // 1c. Incoming Shift Swap Requests
    const incomingSwaps = await ShiftSwapRequest.find({
        targetUserId: userId,
        status: 'pending'
    })
        .populate('requestorId', 'firstName lastName image slug')
        .populate('targetUserId', 'firstName lastName image')
        .sort({ createdAt: -1 })
        .lean();

    // 2. Approvals (for Managers)
    const isApprover = userRoles.some((r: string) =>
        ["owner", "hr", "admin", "super_user", "tech"].includes(r.toLowerCase())
    );

    let approvals: any = {
        vacations: [],
        absences: [],
        overtime: [],
        coverage: [],
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
                // Exclude self from approvals list
                const empIds = employeesInStore.map(e => e._id).filter(id => id.toString() !== userId);
                query.employeeId = { $in: empIds };
            } else {
                query.employeeId = { $in: [] };
            }
        } else {
            // Global approver: See all, but exclude self
            query.employeeId = { $ne: userId };
        }

        const [pendingVacations, pendingAbsences, pendingOvertime] = await Promise.all([
            VacationRequest.find(query).populate('employeeId', 'firstName lastName').sort({ createdAt: 1 }).lean(),
            AbsenceRequest.find(query).populate('employeeId', 'firstName lastName').sort({ createdAt: 1 }).lean(),
            OvertimeRequest.find(query).populate('employeeId', 'firstName lastName').sort({ createdAt: 1 }).lean()
        ]);

        approvals.vacations = pendingVacations;
        approvals.absences = pendingAbsences;
        approvals.absences = pendingAbsences;
        approvals.overtime = pendingOvertime;

        // Coverage Approvals (Pending HR/Admin review after acceptance)
        // Or strictly 'pending_hr' status requests, excluding own requests
        const pendingCoverage = await ShiftCoverageRequest.find({
            status: 'pending_hr',
            originalEmployeeId: { $ne: userId }
        }) // adjust query for RBAC if needed
            .populate('originalEmployeeId', 'firstName lastName')
            .populate('acceptedBy', 'firstName lastName')
            .populate('originalShift') // Need shift details
            .lean();

        approvals.coverage = pendingCoverage;

        // Schedules check
        const scheduleQuery: any = { status: 'draft', createdBy: { $ne: userId } };

        if (isGlobalApprover) {
            approvals.schedules = await Schedule.find(scheduleQuery)
                .populate('storeId', 'name')
                .populate('storeDepartmentId', 'name')
                .lean();
        } else {
            const manager = await Employee.findById(userId).select("storeId");
            if (manager?.storeId) {
                approvals.schedules = await Schedule.find({ ...scheduleQuery, storeId: manager.storeId })
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
            overtime: JSON.parse(JSON.stringify(myOvertime)),
            coverage: JSON.parse(JSON.stringify(myCoverage)),
            swaps: JSON.parse(JSON.stringify(incomingSwaps))
        },
        availableCoverage: JSON.parse(JSON.stringify(availableCoverage)),
        approvals: JSON.parse(JSON.stringify(approvals))
    };
}

export async function getActionHistory() {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");
    const userId = session.user.id;

    // Fetch last 50 items combined? Or 20 of each? Let's do 20 of each for now.
    const [vacations, absences, overtime, coverage] = await Promise.all([
        VacationRequest.find({
            employeeId: userId,
            status: { $ne: 'pending' }
        }).sort({ updatedAt: -1 }).limit(20).lean(),

        AbsenceRequest.find({
            employeeId: userId,
            status: { $ne: 'pending' }
        }).sort({ updatedAt: -1 }).limit(20).lean(),

        OvertimeRequest.find({
            employeeId: userId,
            status: { $ne: 'pending' }
        }).sort({ updatedAt: -1 }).limit(20).lean(),

        ShiftCoverageRequest.find({
            originalEmployeeId: userId,
            status: { $in: ['approved', 'completed', 'cancelled', 'rejected'] }
        }).sort({ updatedAt: -1 }).limit(20).populate({
            path: 'originalShift.storeId',
            select: 'name'
        }).lean()
    ]);

    return {
        vacations: JSON.parse(JSON.stringify(vacations)),
        absences: JSON.parse(JSON.stringify(absences)),
        overtime: JSON.parse(JSON.stringify(overtime)),
        coverage: JSON.parse(JSON.stringify(coverage))
    };
}
