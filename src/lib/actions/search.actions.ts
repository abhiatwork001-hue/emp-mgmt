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

    const roles = (currentUser.roles || []).map((r: string) => r.toLowerCase().replace(/ /g, "_"));
    const isSuper = roles.some((r: string) => ["owner", "admin", "hr", "super_user", "tech"].includes(r));
    const isKitchen = roles.some((r: string) => ["chef", "head_chef", "cook", "kitchen_staff"].includes(r));
    const isManager = roles.includes("store_manager");

    const hasFullAccess = isSuper;

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

    // --- SCOPE RESTRICTIONS ---
    let skipEmployees = false;
    let skipStores = false;

    // 1. Employee Scope
    if (isSuper) {
        // Can see all employees
    } else if (isManager && currentUser.storeId) {
        // Can see employees in their store
        employeeFilter.storeId = currentUser.storeId;
    } else {
        // Regular employees can only search for THEMSELVES (privacy)
        employeeFilter._id = currentUser._id;
    }

    // 2. Store Scope
    if (!hasFullAccess) {
        if (currentUser.storeId) {
            storeFilter._id = currentUser.storeId;
        } else {
            skipStores = true;
        }
    }

    // 3. Recipe Scope (Food)
    // If NOT Super or Kitchen, we restrict by Department Access
    if (!isSuper && !isKitchen) {
        let userGlobalDeptId = null;

        if (currentUser.storeDepartmentId) {
            const sd = await StoreDepartment.findById(currentUser.storeDepartmentId).select("globalDepartmentId").lean();
            if (sd) {
                userGlobalDeptId = (sd as any).globalDepartmentId;
            }
        }

        if (userGlobalDeptId) {
            foodFilter.$or = [
                { accessibleGlobalDepartments: { $exists: false } },
                { accessibleGlobalDepartments: { $size: 0 } },
                { accessibleGlobalDepartments: userGlobalDeptId }
            ];
        } else {
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
