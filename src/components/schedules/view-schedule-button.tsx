"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getOrCreateSchedule } from "@/lib/actions/schedule.actions";
import { Loader2, Calendar } from "lucide-react";

interface ViewScheduleButtonProps {
    storeId: string;
    departmentId: string;
}

export function ViewScheduleButton({ storeId, departmentId }: ViewScheduleButtonProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleViewSchedule = async () => {
        setLoading(true);
        try {
            const today = new Date();
            const schedule = await getOrCreateSchedule(storeId, departmentId, today);

            if (schedule && schedule._id) {
                router.push(`/dashboard/schedules/${schedule._id}`);
            } else {
                alert("Could not access schedule");
            }
        } catch (error) {
            console.error("Failed to access schedule", error);
            alert("Failed to navigate to schedule");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button onClick={handleViewSchedule} disabled={loading} variant="outline">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
            View Current Schedule
        </Button>
    );
}
