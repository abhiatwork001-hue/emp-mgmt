"use server";

import dbConnect from "@/lib/db";
import { EvaluationTemplate, EvaluationAssignment, EvaluationResponse, Store, Employee, Notification } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { logAction } from "./log.actions";
import { pusherServer } from "../pusher";

// --- Template Management ---

export async function createEvaluationTemplate(data: any) {
    await dbConnect();

    // Ensure we have questions formatted correctly
    if (!data.questions || !Array.isArray(data.questions)) {
        throw new Error("Invalid questions data.");
    }

    const template = await EvaluationTemplate.create({
        ...data,
        isActive: true
    });

    revalidatePath("/dashboard/evaluations/templates");
    return JSON.parse(JSON.stringify(template));
}

export async function updateEvaluationTemplate(id: string, data: any) {
    await dbConnect();

    const template = await EvaluationTemplate.findByIdAndUpdate(
        id,
        { ...data },
        { new: true }
    );

    revalidatePath("/dashboard/evaluations/templates");
    return JSON.parse(JSON.stringify(template));
}

export async function deleteEvaluationTemplate(id: string) {
    await dbConnect();
    // Soft delete
    await EvaluationTemplate.findByIdAndUpdate(id, { isActive: false });
    revalidatePath("/dashboard/evaluations/templates");
    return { success: true };
}

export async function getEvaluationTemplates() {
    await dbConnect();
    const templates = await EvaluationTemplate.find({ isActive: true }).sort({ createdAt: -1 });
    return JSON.parse(JSON.stringify(templates));
}

export async function getTemplateById(id: string) {
    await dbConnect();
    const template = await EvaluationTemplate.findById(id);
    if (!template) throw new Error("Template not found");
    return JSON.parse(JSON.stringify(template));
}

// --- Assignments ---

export async function assignEvaluationToStore(templateId: string, storeId: string, managerId: string, dueDate: Date) {
    await dbConnect();

    const assignment = await EvaluationAssignment.create({
        templateId,
        storeId,
        assignedTo: managerId,
        status: 'pending',
        dueDate
    });

    // Notify Manager
    await Notification.create({
        title: "New Evaluation Assignment",
        message: "You have been assigned a new staff evaluation task.",
        type: "info",
        category: "system",
        relatedStoreId: storeId,
        recipients: [{ userId: managerId, read: false }]
    });

    // Create Task (Using Task System if integrated, but independent here for now)
    // We could integrate with task.actions.ts here

    revalidatePath("/dashboard/evaluations");
    return JSON.parse(JSON.stringify(assignment));
}

export async function getPendingEvaluationsForManager(managerId: string) {
    await dbConnect();

    const assignments = await EvaluationAssignment.find({
        assignedTo: managerId,
        status: 'pending'
    })
        .populate('templateId', 'title description')
        .populate('storeId', 'name slug')
        .sort({ dueDate: 1 });

    return JSON.parse(JSON.stringify(assignments));
}

export async function submitEvaluationResponse(assignmentId: string, employeeId: string, answers: any[], isAnonymous: boolean) {
    try {
        await dbConnect();

        // Validate Assignment
        const assignment = await EvaluationAssignment.findById(assignmentId);
        if (!assignment) throw new Error("Assignment not found");

        const response = await EvaluationResponse.create({
            assignmentId,
            employeeId,
            evaluatorId: assignment.assignedTo,
            answers,
            isAnonymous
        });

        // Check if all employees in store are evaluated to mark assignment as complete?
        // Or just keep assignment open until dueDate.
        // For now, let's keep it open so they can evaluate multiple employees.

        return { success: true, response: JSON.parse(JSON.stringify(response)) };
    } catch (error: any) {
        console.error("Submit Evaluation Error:", error);
        return { success: false, message: error.message };
    }
}

export async function getStoreEmployeesForEvaluation(storeId: string) {
    await dbConnect();
    const employees = await Employee.find({ storeId, active: true }).select('firstName lastName positionId image').populate('positionId', 'name');
    return JSON.parse(JSON.stringify(employees));
}

export async function getEvaluationResults(assignmentId: string) {
    await dbConnect();

    const results = await EvaluationResponse.find({ assignmentId })
        .populate('employeeId', 'firstName lastName positionId')
        .populate('evaluatorId', 'firstName lastName');

    return JSON.parse(JSON.stringify(results));
}

// Admin / HR Dashboard Data
export async function getAllAssignments() {
    try {
        await dbConnect();

        // Use lean() for performance and safety? 
        // Populate might fail if references don't exist? No, usually returns null.
        const assignments = await EvaluationAssignment.find({})
            .populate('templateId', 'title')
            .populate('storeId', 'name')
            .populate('assignedTo', 'firstName lastName')
            .sort({ createdAt: -1 });

        // Enhance with completion count
        const enhanced = await Promise.all(assignments.map(async (a: any) => {
            if (!a) return null;
            // Robust check for missing refs
            const safeObj = {
                _id: a._id.toString(),
                templateTitle: a.templateId?.title || "Unknown Template",
                storeName: a.storeId?.name || "Unknown Store",
                assignedToName: a.assignedTo ? `${a.assignedTo.firstName} ${a.assignedTo.lastName}` : "Unassigned",
                status: a.status,
                dueDate: a.dueDate,
                createdAt: a.createdAt
            };

            const count = await EvaluationResponse.countDocuments({ assignmentId: a._id });
            return { ...a.toObject(), ...safeObj, responseCount: count };
        }));

        return JSON.parse(JSON.stringify(enhanced.filter(Boolean)));
    } catch (error) {
        console.error("Error in getAllAssignments:", error);
        return [];
    }
}
