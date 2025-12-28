import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getNotes } from "@/lib/actions/personal-todo.actions";
import { NotesPageClient } from "@/components/notes/notes-page-client";

export default async function NotesPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const userId = (session.user as any).id;
    const notes = await getNotes(userId);

    return (
        <div className="flex-1 p-6 md:p-8 h-full flex flex-col bg-background/50">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">My Notes & Workflow</h1>
                    <p className="text-muted-foreground mt-1">Manage your tasks, ideas, and reminders in one place.</p>
                </div>
            </div>

            <NotesPageClient
                initialNotes={notes}
                userId={userId}
            />
        </div>
    );
}
