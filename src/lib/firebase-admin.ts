import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

if (!admin.apps.length) {
    try {
        const serviceAccountPath = join(process.cwd(), 'service-account.json');
        // Check if file exists to give better error
        try {
            // We use readFileSync to avoid bundler trying to resolve the dynamic path
            const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("Firebase Admin Initialized");
        } catch (fileErr) {
            console.error("Could not read service-account.json. Ensure it is in the project root.", fileErr);
        }

    } catch (error) {
        console.error("Firebase Admin Initialization Failed:", error);
    }
}

export const firebaseAdmin = admin;
