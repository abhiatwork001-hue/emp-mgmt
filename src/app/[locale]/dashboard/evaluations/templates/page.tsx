import { getEvaluationTemplates } from "@/lib/actions/evaluation.actions";
import { TemplatesManager } from "@/components/evaluations/templates-manager";

// Force dynamic since we fetch data that changes
export const dynamic = 'force-dynamic';

export default async function EvaluationTemplatesPage() {
    const templates = await getEvaluationTemplates();

    return (
        <div className="p-6">
            <TemplatesManager initialTemplates={templates} />
        </div>
    );
}
