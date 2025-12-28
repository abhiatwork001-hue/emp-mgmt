"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function getUserSession() {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return null;

    return {
        ...session.user,
        userId: (session.user as any).id,
        role: (session.user as any).roles?.[0] || 'Employee' // Fallback
    };
}
