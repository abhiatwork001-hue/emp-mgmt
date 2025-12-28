import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getAllStores } from "@/lib/actions/store.actions";
import { getAllEmployees } from "@/lib/actions/employee.actions";
import { getTasksForUser } from "@/lib/actions/task.actions";
import { getAllGlobalDepartments } from "@/lib/actions/department.actions";
import { TaskBoard } from "@/components/tasks/task-board";
import { Employee } from "@/lib/models";
import connectToDB from "@/lib/db";

export default async function TasksPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    await connectToDB();
    const employee = await Employee.findOne({ email: session.user.email });
    if (!employee) redirect("/login");

    const userId = (session.user as any).id;
    const tasks = await getTasksForUser(userId);
    const stores = await getAllStores();
    const depts = await getAllGlobalDepartments();
    const allEmployees = await getAllEmployees();

    return (
        <div className="flex-1 p-6 md:p-8 h-full flex flex-col bg-background/50">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tasks & Assignments</h1>
                    <p className="text-muted-foreground mt-1">Manage, assign, and track team tasks.</p>
                </div>
            </div>

            <div className="flex-1">
                <TaskBoard
                    tasks={JSON.parse(JSON.stringify(tasks))}
                    currentUserId={userId}
                    currentUser={JSON.parse(JSON.stringify(employee))}
                    stores={JSON.parse(JSON.stringify(stores))}
                    storeDepartments={JSON.parse(JSON.stringify(depts))}
                    managers={JSON.parse(JSON.stringify(allEmployees))}
                />
            </div>
        </div>
    );
}
