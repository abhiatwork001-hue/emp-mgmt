import { getCategories, getFoodById } from "@/lib/actions/recipe.actions";
import { getAllGlobalDepartments } from "@/lib/actions/department.actions";
import { RecipeForm } from "../../recipe-form";
import { getUserSession } from "@/lib/actions/auth.actions";
import { notFound } from "next/navigation";

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const food = await getFoodById(id);
    const categories = await getCategories();
    const globalDepartments = await getAllGlobalDepartments();
    const user = await getUserSession();

    if (!food) {
        return notFound();
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Edit Recipe: {food.name}</h1>
            <RecipeForm
                categories={categories}
                globalDepartments={globalDepartments}
                userGlobalDepartmentId={(user as any)?.storeDepartmentId?.toString()} // Or global department logic
                initialData={food}
            />
        </div>
    );
}
