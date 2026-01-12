import { StoreComparisonDashboard } from "@/components/stores/store-comparison-dashboard";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from 'next-intl/server'; // If using i18n, else skip

export default async function ReviewsPage() {
    return (
        <div className="p-6 space-y-6">
            <StoreComparisonDashboard />
        </div>
    );
}
