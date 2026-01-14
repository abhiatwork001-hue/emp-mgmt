"use server";

import connectToDB from "@/lib/db";
import { StoreCredential } from "@/lib/models";
import { encrypt, decrypt } from "@/lib/encryption";
import { revalidatePath } from "next/cache";

export async function createCredential(data: {
    storeId: string;
    serviceName: string;
    type?: 'standard' | 'simple';
    username?: string;
    passwordRaw: string;
    description: string;
    userId: string;
}) {
    try {
        await connectToDB();

        const { encryptedData, iv } = encrypt(data.passwordRaw);

        const cred = await StoreCredential.create({
            storeId: data.storeId,
            serviceName: data.serviceName,
            type: data.type || 'standard',
            username: data.username,
            encryptedPassword: encryptedData,
            iv: iv,
            description: data.description,
            createdBy: data.userId,
            history: [],
            auditLog: [{
                action: 'create',
                userId: data.userId
            }]
        });

        revalidatePath("/dashboard/store");
        return { success: true };
    } catch (error) {
        return { success: false, error: "Failed to create" };
    }
}

export async function updateCredential(data: {
    credentialId: string;
    serviceName?: string;
    username?: string;
    description?: string;
    passwordRaw?: string;
    userId: string;
}) {
    try {
        await connectToDB();
        const cred = await StoreCredential.findById(data.credentialId);
        if (!cred) return { success: false, error: "Not found" };

        // Track changes
        const changes: string[] = [];
        if (data.serviceName && cred.serviceName !== data.serviceName) changes.push('serviceName');
        if (data.username !== undefined && cred.username !== data.username) changes.push('username'); // Check undefined for optional
        if (data.description !== undefined && cred.description !== data.description) changes.push('description');

        if (data.serviceName) cred.serviceName = data.serviceName;
        if (data.username !== undefined) cred.username = data.username;
        if (data.description !== undefined) cred.description = data.description;

        if (data.passwordRaw) {
            const { encryptedData, iv } = encrypt(data.passwordRaw);

            // Push current to history
            cred.history.push({
                encryptedPassword: cred.encryptedPassword,
                iv: cred.iv,
                changedBy: data.userId,
                changedAt: new Date()
            });

            // Update with new
            cred.encryptedPassword = encryptedData;
            cred.iv = iv;
            changes.push('password');
        }

        cred.updatedBy = data.userId;

        // Audit
        cred.auditLog.push({
            action: 'update',
            userId: data.userId,
            details: `Updated fields: ${changes.join(', ')}`
        });

        await cred.save();
        revalidatePath("/dashboard/store");
        return { success: true };
    } catch (error) {
        return { success: false };
    }
}

export async function revealPassword(credentialId: string, userId: string) {
    try {
        await connectToDB();
        const cred = await StoreCredential.findById(credentialId);
        if (!cred) return { success: false, error: "Not found" };

        // Audit Log for Viewing
        cred.auditLog.push({
            action: 'view',
            userId: userId
        });
        await cred.save();

        const decrypted = decrypt(cred.encryptedPassword, cred.iv);
        return { success: true, password: decrypted };
    } catch (error) {
        return { success: false, error: "Failed to decrypt" };
    }
}

export async function getCredentialsForStore(storeId: string) {
    try {
        await connectToDB();
        // Exclude big fields and sensitive data by default
        const creds = await StoreCredential.find({ storeId })
            .select('-history -auditLog') // Don't send logs to client in list view
            .lean();

        // Sanitize: REMOVE encrypted strings from list
        const sanitized = creds.map((c: any) => ({
            ...c,
            _id: c._id.toString(),
            encryptedPassword: "", // HIDE
            iv: "", // HIDE
            isLocked: true
        }));

        return JSON.parse(JSON.stringify(sanitized));
    } catch (error) {
        return [];
    }
}
