"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { getOrCreateSchedule } from "@/lib/actions/schedule.actions";
import { Loader2, Calendar } from "lucide-react";

interface ViewScheduleButtonProps {
    storeId: string;
    departmentId: string;
}

export function ViewScheduleButton({ storeId, departmentId }: ViewScheduleButtonProps) {
    const t = useTranslations("Schedules.viewScheduleButton");
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleViewSchedule = async () => {
        setLoading(true);
        try {
            const today = new Date();
            const schedule = await getOrCreateSchedule(storeId, departmentId, today);

            if (schedule && (schedule.slug || schedule._id)) {
                router.push(`/dashboard/schedules/${schedule.slug || schedule._id}`);
            } else {
                alert(t('errorAccess'));
            }
        } catch (error) {
            console.error("Failed to access schedule", error);
            alert(t('errorNavigate'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button onClick={handleViewSchedule} disabled={loading} variant="outline">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
            {t('text')}
        </Button>
    );
}
