"use server";

import dbConnect from "@/lib/db";
import { Employee, Store } from "@/lib/models";
import { revalidatePath } from "next/cache";

export type SearchResult = {
    type: 'employee' | 'store';
    id: string;
    name: string;
    subtext: string;
    url: string;
    image?: string;
};

export async function globalSearch(query: string): Promise<SearchResult[]> {
    await dbConnect();

    if (!query || query.length < 2) return [];

    const regex = new RegExp(query, 'i');

    const [employees, stores] = await Promise.all([
        Employee.find({
            $or: [
                { firstName: { $regex: regex } },
                { lastName: { $regex: regex } },
                { email: { $regex: regex } }
            ]
        }).select("firstName lastName email image positionId").populate("positionId", "name").limit(5).lean(),

        Store.find({
            name: { $regex: regex }
        }).select("name address").limit(5).lean()
    ]);

    const results: SearchResult[] = [];

    employees.forEach((emp: any) => {
        results.push({
            type: 'employee',
            id: emp._id.toString(),
            name: `${emp.firstName} ${emp.lastName}`,
            subtext: emp.positionId?.name || emp.email,
            url: `/dashboard/employees/${emp._id}`,
            image: emp.image
        });
    });

    stores.forEach((store: any) => {
        results.push({
            type: 'store',
            id: store._id.toString(),
            name: store.name,
            subtext: store.address || "Store",
            url: `/dashboard/stores/${store._id}`
        });
    });

    return results;
}
