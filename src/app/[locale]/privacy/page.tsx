import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
    const t = await getTranslations({ locale, namespace: "Legal" });
    return {
        title: "Privacy Policy | Chick-fil-A Helper",
    };
}

export default function PrivacyPage() {
    const t = useTranslations("Legal");

    return (
        <div className="container mx-auto py-12 px-4 max-w-4xl text-slate-800 dark:text-slate-200">
            <h1 className="text-3xl font-bold mb-8 text-primary">{t('privacy.heading')}</h1>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">{t('privacy.dataProcessing.title')}</h2>
                <div className="bg-muted/30 p-6 rounded-lg border border-border">
                    <p className="mb-4">
                        <strong>{t('privacy.dataProcessing.basisLabel')}</strong> {t('privacy.dataProcessing.basisValue')}
                    </p>
                    <p className="italic text-muted-foreground">
                        {t('privacy.dataProcessing.text')}
                    </p>
                </div>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">{t('privacy.collection.title')}</h2>
                <ul className="list-disc pl-6 space-y-2">
                    <li>{t('privacy.collection.identityData')}</li>
                    <li>{t('privacy.collection.employmentData')}</li>
                    <li>{t('privacy.collection.logs')}</li>
                </ul>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">{t('privacy.retention.title')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-md">
                        <h3 className="font-bold mb-2">{t('privacy.retention.hrRecords')}</h3>
                        <p className="text-sm">{t('privacy.retention.hrText')}</p>
                    </div>
                    <div className="p-4 border rounded-md">
                        <h3 className="font-bold mb-2">{t('privacy.retention.logsRecords')}</h3>
                        <p className="text-sm">{t('privacy.retention.logsText')}</p>
                    </div>
                </div>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">{t('privacy.rights.title')}</h2>
                <p className="mb-4">
                    {t('privacy.rights.intro')}
                </p>
                <p>
                    {t('privacy.rights.contact')}
                    <a href="mailto:privacy@example.com" className="text-primary hover:underline ml-1">privacy@example.com</a>
                </p>
            </section>
        </div>
    );
}
