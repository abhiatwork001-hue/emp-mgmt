
import fs from 'fs';
import path from 'path';

async function main() {
    try {
        // Manually load env if needed
        if (!process.env.MONGODB_URI) {
            const envPath = path.join(process.cwd(), '.env.local');
            if (fs.existsSync(envPath)) {
                const envContent = fs.readFileSync(envPath, 'utf-8');
                const match = envContent.match(/MONGODB_URI=(.*)/);
                if (match && match[1]) {
                    process.env.MONGODB_URI = match[1].trim(); // Remove quotes if any? Usually dotenv handles that, but simple string is ok for now.
                    // If quoted, remove them
                    if ((process.env.MONGODB_URI.startsWith('"') && process.env.MONGODB_URI.endsWith('"')) ||
                        (process.env.MONGODB_URI.startsWith("'") && process.env.MONGODB_URI.endsWith("'"))) {
                        process.env.MONGODB_URI = process.env.MONGODB_URI.slice(1, -1);
                    }
                    console.log("Loaded MONGODB_URI from .env.local manually");
                }
            } else {
                console.error(".env.local not found!");
            }
        }

        // Dynamic imports to ensure env vars are loaded first
        const dbConnect = (await import("../lib/db")).default;
        const { Employee } = await import("../lib/models");

        await dbConnect();
        console.log("Connected to DB");

        const owners = await Employee.find({
            $or: [
                { roles: "owner" },
                { role: "owner" }
            ]
        });

        if (owners.length > 0) {
            console.log("Found owners:");
            owners.forEach(o => {
                console.log(`- ${o.firstName} ${o.lastName} (${o.email}) [Roles: ${o.roles?.join(', ')}]`);
            });
        } else {
            console.log("No owners found.");
            console.log("List of employees (candidate to promote):");
            const employees = await Employee.find({}).limit(10);
            employees.forEach(e => {
                console.log(`- ${e.firstName} ${e.lastName} (${e.email})`);
            });
        }
    } catch (error) {
        console.error("Error:", error);
    } finally {
        process.exit(0);
    }
}

main();
