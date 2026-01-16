"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { HolidayGreetingWidget } from "@/components/dashboard/widgets/holiday-greeting-widget";
import { ActionRequiredWidget } from "./action-required-widget";
import { StaffingRiskWidget } from "./staffing-risk-widget";
import { TodayGlanceWidget } from "./today-glance-widget";
import { UpcomingEventsWidget } from "./upcoming-events-widget";
import { ComplianceWidget } from "./compliance-widget";
import { HRInsightsWidget } from "./hr-insights-widget";
import { AnnouncementsWidget } from "./announcements-widget";
import { StaffingAlerts } from "./staffing-alerts";

interface HRDashboardProps {
    employee: any;
    // Action Required Data - Arrays for full request objects
    vacationRequests?: any[];
    absenceRequests?: any[];
    overtimeRequests?: any[];
    scheduleConflicts?: any[];
    coverageRequests?: any[];

    // Staffing Risk Data
    understaffedToday?: string[];
    understaffedTomorrow?: string[];
    overlappingVacations?: { department: string; count: number }[];
    sickLeaveImpact?: { department: string; severity: 'low' | 'medium' | 'high' }[];

    // Today at a Glance Data
    workingCount?: number;
    absentCount?: number;
    vacationCount?: number;

    // Upcoming Events Data
    upcomingEvents?: any[];

    // Compliance Data
    expiringDocs?: number;
    missingContracts?: number;
    incompleteProfiles?: number;
    urgentComplianceCount?: number;

    // Insights Data
    vacationData?: { month: string; thisYear: number; lastYear: number; departments?: any[] }[];
    absenceData?: { month: string; days: number; departments?: any[] }[];

    // Announcements Data
    announcements?: any[];
}

export function HRDashboard({
    employee,
    vacationRequests = [],
    absenceRequests = [],
    overtimeRequests = [],
    scheduleConflicts = [],
    coverageRequests = [],
    understaffedToday = [],
    understaffedTomorrow = [],
    overlappingVacations = [],
    sickLeaveImpact = [],
    workingCount = 0,
    absentCount = 0,
    vacationCount = 0,
    upcomingEvents = [],
    expiringDocs = 0,
    missingContracts = 0,
    incompleteProfiles = 0,
    urgentComplianceCount = 0,
    vacationData = [],
    absenceData = [],
    announcements = []
}: HRDashboardProps) {
    const t = useTranslations("Dashboard.hr");

    return (
        <div className="flex flex-col gap-8 animate-in fade-in duration-700">
            {/* Header Badge */}
            <div className="flex items-center gap-3">
                <Badge variant="outline" className="px-3 py-1 bg-primary/5 text-primary border-primary/20 font-bold uppercase tracking-wider text-[10px]">
                    HR Dashboard
                </Badge>
                <div className="h-[1px] flex-1 bg-gradient-to-r from-border/50 via-border to-transparent" />
            </div>

            {/* Greeting & Weather */}
            <HolidayGreetingWidget />

            {/* Critical Staffing Alerts - Show when there are risks */}
            <StaffingAlerts />

            {/* A. Action Required - Full Width, Top Priority, Maximum Dominance */}
            <div className="w-full">
                <ActionRequiredWidget
                    vacationRequests={vacationRequests}
                    absenceRequests={absenceRequests}
                    overtimeRequests={overtimeRequests}
                    scheduleConflicts={scheduleConflicts}
                    coverageRequests={coverageRequests}
                />
            </div>

            {/* B & C - Staffing Risk + Today at a Glance (Mobile: Both shown, Desktop: Side by side) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <StaffingRiskWidget
                    understaffedToday={understaffedToday}
                    understaffedTomorrow={understaffedTomorrow}
                    overlappingVacations={overlappingVacations}
                    sickLeaveImpact={sickLeaveImpact}
                />
                <TodayGlanceWidget
                    workingCount={workingCount}
                    absentCount={absentCount}
                    vacationCount={vacationCount}
                />
            </div>

            {/* Desktop Only: D, E - Upcoming Events & Compliance */}
            <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-8">
                <UpcomingEventsWidget events={upcomingEvents} />
                <ComplianceWidget
                    expiringDocs={expiringDocs}
                    missingContracts={missingContracts}
                    incompleteProfiles={incompleteProfiles}
                    urgentCount={urgentComplianceCount}
                />
            </div>

            {/* Desktop Only: F. Insights - Full Width, Secondary Priority */}
            <div className="hidden md:block w-full">
                <HRInsightsWidget
                    vacationData={vacationData}
                    absenceData={absenceData}
                />
            </div>

            {/* Desktop Only: G. Announcements */}
            <div className="hidden md:block w-full">
                <AnnouncementsWidget announcements={announcements} />
            </div>
        </div>
    );
}
