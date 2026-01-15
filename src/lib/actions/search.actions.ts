"use server";

import dbConnect from "@/lib/db";
import { Employee, Store, Food, StoreResource, Supplier, GlobalDepartment, StoreDepartment } from "@/lib/models";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type SearchResult = {
    type: 'employee' | 'store' | 'recipe' | 'supplier' | 'resource' | 'department';
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
    const isManager = roles.includes("store_manager") || roles.includes("manager");
    const isStoreDeptHead = roles.includes("store_department_head");

    const hasFullAccess = isSuper;
    const userStoreId = currentUser.storeId;

    // Permissions
    const canSearchSuppliers = isSuper || isManager || isStoreDeptHead;

    if (!query || query.length < 2) return [];

    // Fuzzy/Zigzag Search Logic
    // Escape special regex chars
    const escapeRegExp = (string: string) => {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // Split by space to get keywords
    const keywords = query.trim().split(/\s+/).filter(k => k.length > 0);

    // Construct Lookahead Regex to match ALL keywords in any order
    // e.g. "chick sauce" -> (?=.*chick)(?=.*sauce)
    const pattern = keywords.map(k => `(?=.*${escapeRegExp(k)})`).join('');
    const regex = new RegExp(pattern, 'i');

    const employeeFilter: any = {
        $or: [
            { firstName: { $regex: regex } },
            { lastName: { $regex: regex } },
            { email: { $regex: regex } }
        ]
    };

    // Employee Scope
    if (isSuper) {
        // Can see all
    } else if (isManager && userStoreId) {
        employeeFilter.storeId = userStoreId;
    } else {
        // Regular employee: See only their store? Or only themselves?
        // Let's allow seeing store coworkers for ease of usage
        if (userStoreId) employeeFilter.storeId = userStoreId;
        else employeeFilter._id = currentUser._id;
    }

    const storeFilter: any = { name: { $regex: regex }, active: true };
    const foodFilter: any = { name: { $regex: regex }, isPublished: true, isDeleted: false };

    const supplierFilter: any = {
        name: { $regex: regex },
        active: true,
        $or: [
            { storeId: { $exists: false } },
            { storeId: null },
            { storeId: userStoreId }
        ]
    };
    if (!userStoreId && !isSuper && !isManager) supplierFilter.storeId = "impossible_id"; // Block if no store and not super (logic remains similar but gated by canSearchSuppliers mostly)

    const resourceFilter: any = {
        name: { $regex: regex },
        active: true,
        $or: [
            { visibility: "global" },
            { storeId: userStoreId }
        ]
    };

    const supplierItemFilter: any = {
        "items.name": { $regex: regex },
        active: true,
        $or: [
            { storeId: { $exists: false } },
            { storeId: null },
            { storeId: userStoreId }
        ]
    };
    if (!userStoreId && !isSuper && !isManager) supplierItemFilter.storeId = "impossible_id";

    // Parallel Fetch
    const [employees, stores, foods, suppliers, supplierItems, resources, globalDepts, storeDepts] = await Promise.all([
        Employee.find(employeeFilter).select("firstName lastName email image positionId slug").populate("positionId", "name translations").limit(3).lean(),
        (isSuper || isManager) ? Store.find(storeFilter).select("name address translations slug").limit(3).lean() : Promise.resolve([]),
        Food.find(foodFilter).select("name category heroImg slug").populate("category", "name").limit(3).lean(),
        canSearchSuppliers ? Supplier.find(supplierFilter).select("name category").limit(3).lean() : Promise.resolve([]),
        canSearchSuppliers ? Supplier.find(supplierItemFilter).select("name items").limit(3).lean() : Promise.resolve([]),
        StoreResource.find(resourceFilter).select("name type").limit(3).lean(),
        GlobalDepartment.find({ name: { $regex: regex } }).select("name slug").limit(3).lean(),
        userStoreId ? StoreDepartment.find({ name: { $regex: regex }, storeId: userStoreId }).select("name slug").limit(3).lean() : Promise.resolve([])
    ]);

    const results: SearchResult[] = [];

    // Map Employees
    employees.forEach((emp: any) => {
        const positionName = emp.positionId?.translations?.[locale]?.name || emp.positionId?.name || "Employee";
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
    stores.forEach((s: any) => {
        results.push({
            type: 'store',
            id: s._id.toString(),
            name: s.translations?.[locale]?.name || s.name,
            subtext: s.address || "Store",
            url: `/dashboard/stores/${s.slug}`
        });
    });

    // Map Recipes
    foods.forEach((f: any) => {
        results.push({
            type: 'recipe',
            id: f._id.toString(),
            name: f.name,
            subtext: (f.category as any)?.name || "Recipe",
            url: `/dashboard/recipes/${f.slug}`,
            image: f.heroImg
        });
    });

    // Map Suppliers
    suppliers.forEach((s: any) => {
        results.push({
            type: 'supplier',
            id: s._id.toString(),
            name: s.name,
            subtext: s.category || "Supplier",
            url: `/dashboard/suppliers/${s._id}`, // Fixed redirect to details page
        });
    });

    // Map Supplier Items
    supplierItems.forEach((s: any) => {
        // Find matching items
        const matchingItems = s.items.filter((i: any) => new RegExp(pattern, 'i').test(i.name)); // Re-use pattern for filter
        matchingItems.forEach((item: any) => {
            results.push({
                type: 'supplier', // Reuse supplier icon/type
                id: `${s._id}-${item.name}`,
                name: item.name,
                subtext: `From ${s.name}`,
                url: `/dashboard/suppliers/${s._id}?highlight=${encodeURIComponent(item.name)}`, // Fixed redirect + highlight param
            });
        });
    });

    // Map Resources
    resources.forEach((r: any) => {
        results.push({
            type: 'resource',
            id: r._id.toString(),
            name: r.name,
            subtext: r.type || "Directory",
            url: `/dashboard/directory`,
        });
    });

    // Map Departments
    globalDepts.forEach((d: any) => {
        results.push({
            type: 'department',
            id: d._id.toString(),
            name: d.name,
            subtext: "Global Department",
            url: `/dashboard/departments/${d.slug}`
        });
    });

    storeDepts.forEach((d: any) => {
        results.push({
            type: 'department',
            id: d._id.toString(),
            name: d.name,
            subtext: "Store Department",
            url: `/dashboard/departments/${d.slug}`
        });
    });

    return results;
}
