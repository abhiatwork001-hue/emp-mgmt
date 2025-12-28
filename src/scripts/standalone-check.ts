
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const EmployeeSchema = new mongoose.Schema({
    firstName: String,
    lastName: String,
    email: String,
    role: String,
    roles: [String]
});

// Polyfill model if already exists (unlikely in standalone) or create
const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);

async function main() {
    try {
        let uri = process.env.MONGODB_URI;
        if (!uri) {
            const filesToCheck = ['.env.local', '.env'];

            for (const file of filesToCheck) {
                const envPath = path.join(process.cwd(), file);
                console.log(`Checking ${file} at:`, envPath);

                if (fs.existsSync(envPath)) {
                    const content = fs.readFileSync(envPath, 'utf-8');
                    const match = content.match(/MONGODB_URI\s*=\s*(.*)/);
                    if (match && match[1]) {
                        uri = match[1].trim().replace(/^["']|["']$/g, '');
                        console.log(`Found URI in ${file} (length: ${uri.length})`);
                        break;
                    }
                }
            }
        }

        if (!uri) {
            console.error("Could not find MONGODB_URI");
            process.exit(1);
        }

        await mongoose.connect(uri);
        console.log("Connected to DB via Standalone script");

        const owners = await Employee.find({
            $or: [
                { roles: "owner" },
                { role: "owner" }
            ]
        });

        if (owners.length > 0) {
            console.log("\n--- FOUND OWNERS ---");
            owners.forEach(o => {
                console.log(`Email: ${o.email} | Name: ${o.firstName} ${o.lastName} | Roles: [${o.roles?.join(', ')}]`);
            });
            console.log("--------------------\n");
        } else {
            console.log("\n--- NO OWNERS FOUND ---");
            console.log("Candidates to promote:");
            const employees = await Employee.find({}).limit(5);
            employees.forEach(e => {
                console.log(`Email: ${e.email} | Name: ${e.firstName} ${e.lastName} | Roles: [${e.roles?.join(', ')}]`);
            });
            console.log("-----------------------\n");
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

main();
