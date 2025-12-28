import { getCategories } from "@/lib/actions/recipe.actions";
import { getAllGlobalDepartments } from "@/lib/actions/department.actions";
import { getUserSession } from "@/lib/actions/auth.actions";
import { redirect } from "next/navigation";
import { RecipeForm } from "../recipe-form";

export default async function NewRecipePage() {
    const session = await getUserSession();
    if (!session) redirect("/login");

    const categories = await getCategories();
    const globalDepartments = await getAllGlobalDepartments();

    // Get User Global Dept ID (optional optimization, for now we let client handle empty or pass session)
    // Same logic as list page, but simpler: pass nothing, form is smart enough or we default.
    // Ideally we pass it to auto-check "Visible to my department"

    return (
        <div className="p-6 pb-20">
            <h1 className="text-2xl font-bold mb-6">Create New Recipe</h1>
            <RecipeForm
                categories={categories}
                globalDepartments={globalDepartments}
            />
        </div>
    );
}
