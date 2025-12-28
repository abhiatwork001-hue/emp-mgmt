import { StoreForm } from "@/components/stores/store-form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getStoreById } from "@/lib/actions/store.actions";

export default async function EditStorePage({ params }: { params: Promise<{ storeId: string }> }) {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    const { storeId } = await params;
    const store = await getStoreById(storeId);

    if (!store) {
        return <div>Store not found</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full border-zinc-700 bg-transparent text-zinc-400 hover:bg-zinc-800 hover:text-white" asChild>
                    <a href={`/dashboard/stores/${storeId}`}>{"<"}</a>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-white">Edit Store</h2>
                    <p className="text-zinc-400">Update store details.</p>
                </div>
            </div>

            <div className="bg-[#1e293b]/50 p-6 rounded-xl border border-zinc-800">
                <StoreForm initialData={store} />
            </div>
        </div>
    );
}
