import { StoreComparisonDashboard } from "@/components/stores/store-comparison-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from 'next-intl/server'; // If using i18n, else skip

export default async function ReviewsPage() {
    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Reputation Management</h1>
                <p className="text-muted-foreground">
                    Monitor Google Reviews and compare store performance across the franchise.
                </p>
            </div>

            <StoreComparisonDashboard />
        </div>
    );
}
