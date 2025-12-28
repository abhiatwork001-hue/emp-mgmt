import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getScheduleById } from "@/lib/actions/schedule.actions";
import { ScheduleEditor } from "./schedule-editor";

export default async function SchedulePage({ params }: { params: Promise<{ id: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const { id } = await params;
    const schedule = await getScheduleById(id);

    if (!schedule) {
        return <div>Schedule not found</div>;
    }

    return <ScheduleEditor initialSchedule={schedule} userId={(session.user as any).id} />;
}
