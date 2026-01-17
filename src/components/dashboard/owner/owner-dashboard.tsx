"use client";

import { motion } from "framer-motion";
import { BusinessAlerts } from "./business-alerts";
import { KPIGrid } from "./kpi-grid";
import { StoreComparison } from "./store-comparison";
import { ComplianceRisks } from "./compliance-risks";
import { CostTrendChart } from "./cost-trend-chart";
import { useTranslations } from "next-intl";
import { AnnouncementsWidget } from "@/components/dashboard/widgets/announcements-widget";
import { SmartInsightWidget } from "./smart-insight-widget";
import { PendingApprovalsWidget } from "./pending-approvals-widget";
import { ReputationWidget } from "./reputation-widget";
import { FinanceWidget } from "./finance-widget";

interface OwnerDashboardProps {
    data: any; // Result from getOwnerStats
}

export function OwnerDashboard({ data }: OwnerDashboardProps) {
    const t = useTranslations("OwnerDashboard");

    const container = {
        hidden: { opacity: 0 },
        show: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1
            }
        }
    };

    const item = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0 }
    };

    return (
        <motion.div
            className="space-y-6 pt-2"
            variants={container}
            initial="hidden"
            animate="show"
        >
            {/* 🧠 Top Insight */}
            <motion.div variants={item}>
                <SmartInsightWidget insight={data.insight} />
            </motion.div>

            {/* 🔴 Row 1: Business Alerts */}
            <motion.div variants={item}>
                <BusinessAlerts alerts={data.alerts} />
            </motion.div>

            {/* ⚡ Row 1.5: High Impact Widgets (Approvals, Reputation, Finance) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div variants={item}>
                    <PendingApprovalsWidget data={data.pendingApprovals} />
                </motion.div>
                <motion.div variants={item}>
                    <ReputationWidget data={data.reputation} />
                </motion.div>
                <motion.div variants={item}>
                    <FinanceWidget data={data.finance} />
                </motion.div>
            </div>

            {/* 🟠 Row 2: Business Health Snapshot */}
            <motion.div variants={item}>
                <div className="mb-2">
                    <h2 className="text-lg font-semibold tracking-tight">{t("healthSnapshot")}</h2>
                    <p className="text-sm text-muted-foreground">{t("healthSnapshotDesc")}</p>
                </div>
                <KPIGrid kpis={data.kpis} />
            </motion.div>

            {/* 🟢 Row 3: Store Comparison */}
            <motion.div variants={item}>
                <StoreComparison stores={data.storeStats} />
            </motion.div>

            {/* Row 4: Charts & Compliance (2 Col) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div variants={item}>
                    <CostTrendChart />
                </motion.div>
                <motion.div variants={item}>
                    <ComplianceRisks risks={data.risks} />
                </motion.div>
            </div>

            {/* Row 5: Announcements */}
            <motion.div variants={item}>
                <AnnouncementsWidget announcements={data.announcements} />
            </motion.div>
        </motion.div>
    );
}
