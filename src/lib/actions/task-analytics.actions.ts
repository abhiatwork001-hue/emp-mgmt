"use server";

import connectToDB from "@/lib/db";
import { Task, Store } from "@/lib/models";

export async function getStoreTaskProgress() {
    try {
        await connectToDB();

        // 1. Fetch all Stores
        const stores = await Store.find({ active: true }).select('name _id');

        // 2. Aggregate tasks by store
        // We look for tasks assigned to the store OR to departments within the store
        // For simplicity in this first pass, we'll focus on tasks assigned to the 'store' scope
        // and tasks assigned to 'store_department'.

        // This is a heavy query if we have millions of tasks, but fine for MVP.
        // Better approach: Usage of Mongo Aggregation Pipeline on Tasks collection.

        const progressData = await Promise.all(stores.map(async (store) => {
            // Count total tasks for this store (assigned directly to store)
            /* 
               Note: This misses tasks assigned to specific individuals IN the store or Departments. 
               Optimally, we'd query by scope.
            */

            // Tasks assigned to the Store specifically
            const storeScopeQuery = {
                "assignedTo": { $elemMatch: { type: 'store', id: store._id } }
            };

            const totalTasks = await Task.countDocuments(storeScopeQuery);
            const completedTasks = await Task.countDocuments({ ...storeScopeQuery, status: 'completed' });

            return {
                storeId: store._id.toString(),
                storeName: store.name,
                total: totalTasks,
                completed: completedTasks,
                percentage: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100)
            };
        }));

        return progressData.sort((a, b) => b.percentage - a.percentage);
    } catch (error) {
        console.error("Error fetching store progress:", error);
        return [];
    }
}
