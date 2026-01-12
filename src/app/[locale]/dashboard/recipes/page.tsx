import { getCategories, getFoods } from "@/lib/actions/recipe.actions";
import { getUserSession } from "@/lib/actions/auth.actions";
import { redirect } from "next/navigation";
import { Employee } from "@/lib/models"; // Need to fetch user details for department check
import { RecipeListClient } from "./recipe-list-client";
import { getTranslations } from "next-intl/server";

export default async function RecipesPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string }> }) {
    const session = await getUserSession();
    if (!session) redirect("/login");

    const t = await getTranslations("Recipes");

    // We need to know the User's Global Department ID to filter recipes.
    // Fetch user details fully to get stored department info if not in session?
    // Session usually has role, but maybe not deep department links?
    // Let's assume we can fetch basic user/employee info or rely on what's available.
    // For now, let's just pass the session ID and let the server action logic handle fetching if needed,
    // OR fetch 'employee' here.

    // Await searchParams for Next.js 15 compatibility
    const { q, cat } = await searchParams;

    // Unified Role Check & Data Fetching
    const { default: dbConnect } = await import("@/lib/db");
    const { Employee } = await import("@/lib/models");
    await dbConnect();

    const employee = await Employee.findById(session.userId).populate({
        path: 'storeDepartmentId',
        populate: { path: 'globalDepartmentId' }
    }).lean();

    const normalizedRoles = employee?.roles?.map((r: string) => r.toLowerCase().replace(/ /g, '_')) || [];
    const sessionRoleNormalized = session.role?.toLowerCase().replace(/ /g, '_');

    // Define Permissions
    const adminRoles = ['owner', 'admin', 'super_user', 'hr', 'tech'];

    // Check if user is a Kitchen department head
    let isKitchenDepartmentHead = false;
    if (normalizedRoles.includes('department_head')) {
        const { getGlobalDepartmentsByHead } = await import("@/lib/actions/department.actions");
        const ledDepts = await getGlobalDepartmentsByHead(session.userId);
        isKitchenDepartmentHead = ledDepts.some((dept: any) =>
            dept.name.toLowerCase().includes("kitchen") ||
            dept.slug.toLowerCase().includes("kitchen")
        );
    }

    const creatorRoles = [
        ...adminRoles,
        'store_department_head',
        'store_manager',
        'chef',
        'head_chef'
    ];

    const canCreate = normalizedRoles.some((r: string) => creatorRoles.includes(r)) ||
        creatorRoles.includes(sessionRoleNormalized) ||
        isKitchenDepartmentHead;
    const isAdmin = normalizedRoles.some((r: string) => adminRoles.includes(r)) || adminRoles.includes(sessionRoleNormalized);

    console.log("RecipesPage Debug:", {
        sessionRole: session.role,
        employeeRoles: employee?.roles,
        normalizedRoles,
        isAdmin,
        canCreate,
        isKitchenDepartmentHead
    });

    let userGlobalDepartmentId = undefined;
    if (employee?.storeDepartmentId?.globalDepartmentId) {
        userGlobalDepartmentId = employee.storeDepartmentId.globalDepartmentId._id.toString();
    }

    const filters = {
        search: q,
        categoryId: cat,
        userGlobalDepartmentId,
        isAdminOrHead: isAdmin, // Also check if department Head?
    };

    const [categories, foods] = await Promise.all([
        getCategories(),
        getFoods(filters)
    ]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
                    <p className="text-muted-foreground">{t('subtitle')}</p>
                </div>
            </div>

            <RecipeListClient
                initialFoods={foods}
                categories={categories}
                permissions={{ canCreate }}
            />
        </div>
    );
}
