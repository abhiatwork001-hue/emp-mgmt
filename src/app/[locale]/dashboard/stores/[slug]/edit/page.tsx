import { StoreForm } from "@/components/stores/store-form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getStoreBySlug } from "@/lib/actions/store.actions";
import { Link } from "@/i18n/routing";

export default async function EditStorePage({ params }: { params: Promise<{ slug: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const { slug } = await params;
    const store = await getStoreBySlug(slug);

    if (!store) {
        return <div>Store not found</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" asChild>
                    <Link href={`/dashboard/stores/${store.slug}`}>{"<"}</Link>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Edit Store</h2>
                    <p className="text-zinc-400">Update store details.</p>
                </div>
            </div>

            <div className="bg-card p-6 rounded-xl border">
                <StoreForm initialData={store} />
            </div>
        </div>
    );
}
