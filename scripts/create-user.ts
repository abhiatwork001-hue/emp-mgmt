import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    if (!process.env.MONGODB_URI) {
        console.error("No MONGODB_URI found in .env.local");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");

        // Schemas (Simplified)
        const EmployeeSchema = new mongoose.Schema({}, { strict: false });
        const StoreSchema = new mongoose.Schema({}, { strict: false });

        const Employee = mongoose.models.Employee || mongoose.model('Employee', EmployeeSchema);
        const Store = mongoose.models.Store || mongoose.model('Store', StoreSchema);

        // 1. Find Store
        const store = await Store.findOne({ active: true });
        if (!store) {
            console.error("No active store found!");
            process.exit(1);
        }
        console.log(`Assigning to Store: ${store.name} (${store._id})`);

        // 2. Prepare Data
        const email = "asish.poudel@chickinho.com";
        const password = email; // "same password"
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userData = {
            firstName: "Asish",
            lastName: "Poudel",
            email: email.toLowerCase(),
            password: hashedPassword,
            storeId: store._id,
            roles: ["employee"], // Default role
            slug: "asish-poudel",
            active: true,
            image: `https://ui-avatars.com/api/?name=Asish+Poudel&background=random`,
            joinedOn: new Date(),
            contract: {
                weeklyHours: 40,
                workingDays: [1, 2, 3, 4, 5]
            }
        };

        // 3. Create or Update
        const existing = await Employee.findOne({ email: userData.email });
        if (existing) {
            console.log("User exists, updating password and store...");
            existing.password = hashedPassword;
            existing.storeId = store._id;
            existing.active = true;
            await existing.save();
            console.log(`User updated: ${existing._id}`);
        } else {
            const created = await Employee.create(userData);
            console.log(`User created: ${created._id}`);
        }

    } catch (error) {
        console.error("Script failed:", error);
    } finally {
        await mongoose.disconnect();
    }
}

main();
