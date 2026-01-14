import { getPendingActions, getActionHistory } from "@/lib/actions/pending-actions.actions";
import { PendingActionsClient } from "@/components/dashboard/pending-actions-client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

export default async function PendingActionsPage() {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect("/login");

    const t = await getTranslations("PendingActions");
    const [data, history] = await Promise.all([
        getPendingActions(),
        getActionHistory()
    ]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-black tracking-tight">{t('title')}</h1>
                <p className="text-muted-foreground">{t('description')}</p>
            </div>

            <PendingActionsClient initialData={data} history={history} userId={session.user.id} />
        </div>
    );
}
