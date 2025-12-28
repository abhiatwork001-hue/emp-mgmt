"use server";

import connectToDB from "@/lib/db";
import { PersonalTodo } from "@/lib/models";
import { revalidatePath } from "next/cache";

export async function getNotes(userId: string) {
    try {
        await connectToDB();
        const docs = await PersonalTodo.find({ userId }).sort({ isFeatured: -1, createdAt: -1 });
        return JSON.parse(JSON.stringify(docs));
    } catch (error) {
        console.error("Error fetching notes:", error);
        return [];
    }
}

export async function createNote(data: {
    userId: string;
    title?: string;
    content: string;
    isTask?: boolean;
    deadline?: string;
}) {
    try {
        await connectToDB();
        const newNote = await PersonalTodo.create({
            userId: data.userId,
            title: data.title || "Note",
            content: data.content,
            isTask: data.isTask || false,
            deadline: data.deadline ? new Date(data.deadline) : undefined,
            completed: false
        });
        revalidatePath("/dashboard");
        return { success: true, note: JSON.parse(JSON.stringify(newNote)) };
    } catch (error) {
        console.error("Error creating note:", error);
        return { success: false, error: "Failed to create note" };
    }
}

export async function toggleNoteCompletion(noteId: string, completed: boolean) {
    try {
        await connectToDB();
        await PersonalTodo.findByIdAndUpdate(noteId, {
            completed,
            completedAt: completed ? new Date() : null
        });
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to update note" };
    }
}

export async function deleteNote(noteId: string) {
    try {
        await connectToDB();
        await PersonalTodo.findByIdAndDelete(noteId);
        revalidatePath("/dashboard");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to delete note" };
    }
}

export async function updateNote(noteId: string, data: {
    title?: string;
    content?: string;
    isTask?: boolean;
    deadline?: string;
}) {
    try {
        await connectToDB();
        const updatedNote = await PersonalTodo.findByIdAndUpdate(noteId, {
            ...data,
            deadline: data.deadline ? new Date(data.deadline) : undefined
        }, { new: true });

        revalidatePath("/dashboard");
        return { success: true, note: JSON.parse(JSON.stringify(updatedNote)) };
    } catch (error) {
        console.error("Error updating note:", error);
        return { success: false, error: "Failed to update note" };
    }
}
