import { StoreForm } from "@/components/stores/store-form";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export default async function NewStorePage() {
    const session = await getServerSession(authOptions);
    if (!session) redirect("/login");

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" asChild>
                    <a href="/dashboard/stores">{"<"}</a>
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Create Store</h2>
                    <p className="text-zinc-400">Add a new store to your company.</p>
                </div>
            </div>

            <div className="bg-card p-6 rounded-xl border">
                <StoreForm />
            </div>
        </div>
    );
}
