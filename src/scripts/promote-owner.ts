
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
                if (fs.existsSync(envPath)) {
                    const content = fs.readFileSync(envPath, 'utf-8');
                    const match = content.match(/MONGODB_URI\s*=\s*(.*)/);
                    if (match && match[1]) {
                        uri = match[1].trim().replace(/^["']|["']$/g, '');
                        console.log(`Found URI in ${file}`);
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
        console.log("Connected to DB");

        const targetEmail = "margaret.robinson.9403@chick.com";
        const employee = await Employee.findOne({ email: targetEmail });

        if (!employee) {
            console.error(`Employee with email ${targetEmail} not found!`);
        } else {
            console.log(`Found employee: ${employee.firstName} ${employee.lastName}`);
            console.log(`Current roles: ${employee.roles}`);

            // Update roles
            if (!employee.roles) employee.roles = [];
            if (!employee.roles.includes('owner')) {
                employee.roles.push('owner');
                // Also ensure 'admin' is there if needed, or owner is enough.
                // Let's keep existing roles and add owner.
                await Employee.updateOne(
                    { _id: employee._id },
                    { $set: { roles: employee.roles } }
                );
                console.log(`SUCCESS: Updated roles to: ${employee.roles}`);
            } else {
                console.log("Employee already has 'owner' role.");
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

main();
