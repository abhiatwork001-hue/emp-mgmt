import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Employee, Store, StoreDepartment, Position } from '../lib/models';

// Load env vars
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not defined");
    process.exit(1);
}

const specificEmployees = [
    { firstName: "Kalina", lastName: "Goncalves" },
    { firstName: "Sergio", lastName: "Loureiro" },
    { firstName: "Alian", lastName: "Sharma" },
    { firstName: "Sakib", lastName: "Ahmed" },
    { firstName: "Eduardo", lastName: "Sotelo" },
    { firstName: "Jose Maria", lastName: "Cotta" },
    { firstName: "Francisco", lastName: "Castelo Branco" },
];

const generateSlug = (text: string) => text.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Math.floor(Math.random() * 1000);

async function seedSpecificEmployees() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI!);
        console.log("✅ Connected.");

        const passwordHash = await bcrypt.hash("password123", 10);

        // Get a random store and department
        const stores = await Store.find({ active: true }).limit(3);
        const departments = await StoreDepartment.find({ active: true }).limit(3);
        const staffPosition = await Position.findOne({ name: "Staff" });

        if (!stores.length || !departments.length || !staffPosition) {
            console.error("❌ Missing required data (stores, departments, or staff position)");
            process.exit(1);
        }

        console.log("🌱 Creating specific employees...");

        for (const emp of specificEmployees) {
            const randomStore = stores[Math.floor(Math.random() * stores.length)];
            const randomDept = departments.find(d => d.storeId.toString() === randomStore._id.toString()) || departments[0];

            const email = `${emp.firstName.toLowerCase()}.${emp.lastName.toLowerCase().replace(/ /g, '')}@lagasy.com`;
            const slug = generateSlug(`${emp.firstName}-${emp.lastName}`);

            // Check if employee already exists
            const existing = await Employee.findOne({ email });
            if (existing) {
                console.log(`⚠️  ${emp.firstName} ${emp.lastName} already exists, skipping...`);
                continue;
            }

            const newEmployee = await Employee.create({
                firstName: emp.firstName,
                lastName: emp.lastName,
                email,
                slug,
                password: passwordHash,
                dob: new Date(1990 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
                joinedOn: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), 1),
                phone: `+351 9${Math.floor(Math.random() * 90000000 + 10000000)}`,
                nif: String(Math.floor(Math.random() * 900000000 + 100000000)),
                address: "Lisbon, Portugal",
                roles: ["Employee"],
                positionId: staffPosition._id,
                storeId: randomStore._id,
                storeDepartmentId: randomDept._id,
                active: true,
                vacationTracker: { 
                    defaultDays: 22, 
                    year: 2025, 
                    usedDays: Math.floor(Math.random() * 10), 
                    rolloverDays: Math.floor(Math.random() * 5) 
                },
                contract: {
                    weeklyHours: 40,
                    workingDays: [1, 2, 3, 4, 5],
                    employmentType: "Contracted"
                },
                positionHistory: [{
                    positionId: staffPosition._id,
                    storeId: randomStore._id,
                    storeDepartmentId: randomDept._id,
                    from: new Date(2020 + Math.floor(Math.random() * 4), 0, 1),
                    reason: "Initial Hire"
                }]
            });

            // Update store and department references
            await Store.findByIdAndUpdate(randomStore._id, { $push: { employees: newEmployee._id } });
            await StoreDepartment.findByIdAndUpdate(randomDept._id, { $push: { employees: newEmployee._id } });

            console.log(`✅ Created: ${emp.firstName} ${emp.lastName} (${email})`);
        }

        console.log("\n✅ All specific employees created successfully!");
        console.log("📧 All emails use @lagasy.com domain");
        console.log("🔑 Password for all: password123");

        process.exit(0);

    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
}

seedSpecificEmployees();
