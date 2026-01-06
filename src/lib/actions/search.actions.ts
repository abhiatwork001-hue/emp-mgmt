"use server";

import dbConnect from "@/lib/db";
import { Employee, Store, Food, StoreDepartment } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type SearchResult = {
    type: 'employee' | 'store' | 'recipe';
    id: string;
    name: string;
    subtext: string;
    url: string;
    image?: string;
};

export async function globalSearch(query: string, locale: string = "en"): Promise<SearchResult[]> {
    const session = await getServerSession(authOptions);
    if (!session?.user) return [];

    await dbConnect();

    // Fetch current user implementation details to determine scope
    const currentUser = await Employee.findById((session.user as any).id);
    if (!currentUser) return [];

    const roles = currentUser.roles || [];
    const isSuper = roles.some((r: string) => ["Owner", "Admin", "HR", "Super User", "Tech"].includes(r));
    // Kitchen Head / Department Head logic needed?
    // If they are a Dept Head, they probably should see recipes related to their dept?
    // For now, let's treat "Kitchen" people as privileged for recipes IF they are heads? 
    // Or just rely on the standard "accessibleGlobalDepartments" logic which works for everyone.

    const isGlobalHead = roles.includes("Department Head");
    const hasFullAccess = isSuper; // Only Super users default to full access for everything. Dept Heads might be restricted to their domain.

    if (!query || query.length < 2) return [];

    const keywords = query.trim().split(/\s+/).filter(k => k.length > 0);

    // Filter Logic
    const regexConditions = keywords.length > 0
        ? {
            $and: keywords.map(keyword => {
                const regex = new RegExp(keyword, 'i');
                return {
                    $or: [
                        { firstName: { $regex: regex } },
                        { lastName: { $regex: regex } },
                        { email: { $regex: regex } }
                    ]
                };
            })
        }
        : {};

    const employeeFilter: any = { ...regexConditions };
    const storeFilter: any = { name: { $regex: new RegExp(query, 'i') } };
    const foodFilter: any = {
        name: { $regex: new RegExp(query, 'i') }
    };

    // Default: Hide deleted and inactive
    if (!isSuper) {
        foodFilter.isActive = true;
        foodFilter.isDeleted = { $ne: true };
    } else {
        // Super/Tech:
        // Show all active/inactive.
        // Show deleted only if Tech? `isSuper` includes Owner/HR/Admin.
        // Dashboard requirement: "really delete... visible to tech only".
        // Search requirement: "make search global for that out as well".
        // Assuming "that" means the deleted/archived stuff.
        // So we allow finding them.
        // However, we probably don't want to show trash to HR/Owner if they're not technical?
        // But `isSuper` is broad.
        // Let's refine `isSuper` or just allow it.
        // Given the prompt "make search global for that out as well", I will remove the artificial `isActive: true` constraint for privileged users.
        // And I won't filter `isDeleted` for them, meaning they can find deleted stuff.
    }

    // --- SCOPE RESTRICTIONS ---
    let skipEmployees = false;
    let skipStores = false;

    // 1. Employee & Store Scope
    if (!hasFullAccess) {
        if (currentUser.storeId) {
            employeeFilter.storeId = currentUser.storeId;
            storeFilter._id = currentUser.storeId;
        } else {
            // Unassigned employee -> No results for stores/employees
            skipEmployees = true;
            skipStores = true;
        }
    }

    // 2. Recipe Scope (Food)
    // If NOT Super, we restrict by Department Access
    if (!isSuper) {
        // We need the user's Global Department to check against food.accessibleGlobalDepartments
        let userGlobalDeptId = null;

        if (currentUser.storeDepartmentId) {
            const sd = await StoreDepartment.findById(currentUser.storeDepartmentId).select("globalDepartmentId").lean();
            if (sd) {
                userGlobalDeptId = (sd as any).globalDepartmentId;
            }
        }

        if (userGlobalDeptId) {
            // Visible if:
            // a) Accessible list is empty (Public/Universal)
            // b) Accessible list includes user's Global Dept ID
            foodFilter.$or = [
                { accessibleGlobalDepartments: { $exists: false } },
                { accessibleGlobalDepartments: { $size: 0 } },
                { accessibleGlobalDepartments: userGlobalDeptId }
            ];
        } else {
            // User has no department -> Can only see public recipes?
            // Or none? Let's allow public.
            foodFilter.$or = [
                { accessibleGlobalDepartments: { $exists: false } },
                { accessibleGlobalDepartments: { $size: 0 } }
            ];
        }
    }

    const [employees, stores, foods] = await Promise.all([
        skipEmployees ? Promise.resolve([]) : Employee.find(employeeFilter)
            .select("firstName lastName email image positionId slug")
            .populate("positionId", "name translations")
            .limit(5)
            .lean(),

        skipStores ? Promise.resolve([]) : Store.find(storeFilter)
            .select("name address translations slug")
            .limit(5)
            .lean(),

        Food.find(foodFilter)
            .select("name category heroImg slug")
            .populate("category", "name")
            .limit(5)
            .lean()
    ]);

    const results: SearchResult[] = [];

    // Map Employees
    employees.forEach((emp: any) => {
        const positionName = emp.positionId?.translations?.[locale]?.name || emp.positionId?.name || emp.email;
        results.push({
            type: 'employee',
            id: emp._id.toString(),
            name: `${emp.firstName} ${emp.lastName}`,
            subtext: positionName,
            url: `/dashboard/employees/${emp.slug}`,
            image: emp.image
        });
    });

    // Map Stores
    stores.forEach((store: any) => {
        const storeName = store.translations?.[locale]?.name || store.name;
        results.push({
            type: 'store',
            id: store._id.toString(),
            name: storeName,
            subtext: store.address || "Store",
            url: `/dashboard/stores/${store.slug}`
        });
    });

    // Map Recipes
    foods.forEach((food: any) => {
        results.push({
            type: 'recipe',
            id: food._id.toString(),
            name: food.name,
            subtext: (food.category as any)?.name || "Recipe",
            url: `/dashboard/recipes/${food.slug}`,
            image: food.heroImg
        });
    });

    return results;
}
