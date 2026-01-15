import { useTranslations } from 'next-intl';
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
    const t = await getTranslations('Legal');
    return {
        title: t('terms.title'),
    };
}

export default function TermsPage() {
    const t = useTranslations('Legal');
    return (
        <div className="container mx-auto py-12 px-4 max-w-4xl text-slate-800 dark:text-slate-200">
            <h1 className="text-3xl font-bold mb-8 text-primary">{t('terms.heading')}</h1>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">{t('terms.acceptableUse.title')}</h2>
                <p className="mb-4">
                    {t('terms.acceptableUse.content')}
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">{t('terms.accountSecurity.title')}</h2>
                <p className="mb-4">
                    {t('terms.accountSecurity.content')}
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">{t('terms.dataAccuracy.title')}</h2>
                <p className="mb-4">
                    {t('terms.dataAccuracy.content')}
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">{t('terms.liability.title')}</h2>
                <p className="mb-4">
                    {t('terms.liability.content')}
                </p>
            </section>
        </div>
    );
}
