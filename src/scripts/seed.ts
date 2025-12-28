import dotenv from 'dotenv';
import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import {
    Company,
    Store,
    GlobalDepartment,
    StoreDepartment,
    Position,
    Employee,
    Schedule,
    ShiftDefinition,
    IEmployee,
} from '../lib/models'; // Adjust path if needed

// Load env vars
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not defined");
    process.exit(1);
}

// --- Constants ---
const STORES_COUNT = 8;
const GLOBAL_DEPTS = [
    "Kitchen", "Front of House", "Marketing", "HR", "Finance",
    "IT", "Logistics", "Legal", "Sales", "Maintenance", "R&D", "Operations"
];
const MIN_STORE_DEPTS = 6;
const TOTAL_EMPLOYEES = 125; // Target
// Specific roles
const ADKINS_COUNT = 2;
const HR_COUNT = 2;
const IT_COUNT = 1;

// --- Helpers ---
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomSubset = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

const firstNames = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa", "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin", "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark", "Ramirez", "Lewis", "Robinson"];

const generateName = () => ({
    first: getRandomElement(firstNames),
    last: getRandomElement(lastNames)
});

async function seed() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI!);
        console.log("✅ Connected.");

        console.log("🔥 Clearing existing data...");
        await Promise.all([
            Company.deleteMany({}),
            GlobalDepartment.deleteMany({}),
            Store.deleteMany({}),
            StoreDepartment.deleteMany({}),
            Position.deleteMany({}),
            Employee.deleteMany({}),
            Schedule.deleteMany({}),
            ShiftDefinition.deleteMany({}),
        ]);

        // 1. Create Company
        console.log("🌱 Creating Company...");
        const company = await Company.create({
            name: "Chick Main Global",
            taxNumber: "999888777",
            address: "123 Main St, Tech City",
            totalVacationsPerYear: 22,
            weekStartsOn: "monday",
            active: true
        });

        // 2. Create Global Departments
        console.log("🌱 Creating Global Departments...");
        const globalDeptDocs: any[] = [];
        for (const name of GLOBAL_DEPTS) {
            const gd = await GlobalDepartment.create({
                name: name,
                description: `Global ${name} department`,
                active: true,
                hasHead: true
            });
            globalDeptDocs.push(gd);
        }
        await Company.findByIdAndUpdate(company._id, { globalDepartments: globalDeptDocs.map(d => d._id) });

        // 3. Create Positions (Global & Store)
        console.log("🌱 Creating Positions...");
        const globalPositions = await Position.insertMany([
            { name: "Global Head", level: 10, isStoreSpecific: false },
            { name: "Administrator", level: 9, isStoreSpecific: false, permissions: ["admin:all"] },
            { name: "HR Specialist", level: 5, isStoreSpecific: false, permissions: ["hr:manage"] },
            { name: "IT Support", level: 5, isStoreSpecific: false, permissions: ["it:manage"] },
        ]);

        const storePositions = await Position.insertMany([
            { name: "Store Manager", level: 8, isStoreSpecific: true },
            { name: "Assistant Manager", level: 7, isStoreSpecific: true },
            { name: "Department Head", level: 6, isStoreSpecific: true },
            { name: "Team Lead", level: 4, isStoreSpecific: true },
            { name: "Staff", level: 2, isStoreSpecific: true },
            { name: "Intern", level: 1, isStoreSpecific: true },
        ]);

        const getPos = (name: string) => [...globalPositions, ...storePositions].find(p => p.name === name)!._id;

        // 4. Create Stores
        console.log("🌱 Creating Stores...");
        const storeDocs: any[] = [];
        for (let i = 1; i <= STORES_COUNT; i++) {
            const store = await Store.create({
                companyId: company._id,
                name: `Chick City #${i}`,
                address: `Street ${i}, City Loop`,
                active: true
            });
            storeDocs.push(store);
        }
        await Company.findByIdAndUpdate(company._id, { branches: storeDocs.map(s => s._id) });

        // 5. Create Store Departments
        console.log("🌱 Creating Store Departments...");
        const allStoreDepts: any[] = [];
        for (const store of storeDocs) {
            // Pick random subset of global depts to exist in this store
            const storeGlobalDepts = getRandomSubset(globalDeptDocs, Math.max(MIN_STORE_DEPTS, getRandomInt(MIN_STORE_DEPTS, GLOBAL_DEPTS.length)));

            for (const gd of storeGlobalDepts) {
                const sd = await StoreDepartment.create({
                    storeId: store._id,
                    globalDepartmentId: gd._id,
                    name: gd.name, // e.g. "Kitchen"
                    positionsAllowed: storePositions.map(p => p._id),
                    active: true
                });
                // Create Shift Definitions for this department
                await ShiftDefinition.insertMany([
                    { name: "Morning", startTime: "08:00", endTime: "16:00", description: "Standard Morning", color: "#FFD700", storeDepartmentId: sd._id },
                    { name: "Afternoon", startTime: "16:00", endTime: "24:00", description: "Standard Afternoon", color: "#FFA500", storeDepartmentId: sd._id },
                    { name: "Night", startTime: "00:00", endTime: "08:00", description: "Standard Night", color: "#4B0082", storeDepartmentId: sd._id },
                ]);
                allStoreDepts.push(sd);
            }
        }

        // 6. Create Employees
        console.log("🌱 Creating Employees...");
        const passwordHash = await bcrypt.hash("password123", 10);
        const allEmployees: any[] = [];

        const createEmp = async (role: string, posId: Types.ObjectId, extra: Partial<IEmployee> = {}) => {
            const { first, last } = generateName();
            const email = `${first.toLowerCase()}.${last.toLowerCase()}.${Math.floor(Math.random() * 9999)}@chick.com`;

            const emp = await Employee.create({
                firstName: first,
                lastName: last,
                email: email,
                password: passwordHash,
                dob: new Date(1990, 0, 1),
                roles: role ? [role] : ["Employee"],
                positionId: posId,
                active: true,
                joinedOn: new Date(),
                vacationTracker: { defaultDays: 22, year: new Date().getFullYear() },
                contract: {
                    weeklyHours: 40,
                    workingDays: [1, 2, 3, 4, 5],
                    employmentType: "Contracted"
                },
                ...extra
            });
            allEmployees.push(emp);
            return emp;
        };

        // 6a. Specialized Roles
        console.log("   -> Admins & Special Roles");
        // 2x Admin
        for (let i = 0; i < ADKINS_COUNT; i++) await createEmp("Admin", getPos("Administrator"));
        // 2x HR
        for (let i = 0; i < HR_COUNT; i++) await createEmp("HR", getPos("HR Specialist"));
        // 1x IT
        for (let i = 0; i < IT_COUNT; i++) await createEmp("IT", getPos("IT Support"));

        // Global Heads (Assign one head to each global dep)
        for (const gd of globalDeptDocs) {
            const head = await createEmp("GlobalHead", getPos("Global Head"));
            await GlobalDepartment.findByIdAndUpdate(gd._id, { $push: { departmentHead: head._id } });
        }

        // 6b. Store Employees
        console.log("   -> Store Employees");
        const remainingCount = TOTAL_EMPLOYEES - allEmployees.length;

        for (let i = 0; i < remainingCount; i++) {
            // Pick a store
            const store = getRandomElement(storeDocs);
            // Pick a department in that store
            const storeDepts = allStoreDepts.filter(sd => sd.storeId.toString() === store._id.toString());
            const dept = getRandomElement(storeDepts);

            // Determine Role/Position
            // Simple distribution: 1 Manager per store, 1 Sub per store, 1 Head per dept, others Staff

            let posName = "Staff";
            let role = "Employee";

            // Check if store needs manager
            const currentManagers = allEmployees.filter(e => e.storeId?.toString() === store._id.toString() && e.roles?.includes("Manager"));
            if (currentManagers.length === 0) {
                posName = "Store Manager";
                role = "Manager";
            } else if (currentManagers.length < 2) { // 1 manager + 1 sub presumably
                // actually lets keep it simple logic, create random distribution but prioritize hierarchy
                const rand = Math.random();
                if (rand < 0.05) posName = "Assistant Manager";
                else if (rand < 0.15) posName = "Department Head";
                else if (rand < 0.25) posName = "Team Lead";
            }

            // Check if Dept needs head
            const deptHead = allEmployees.find(e => e.storeDepartmentId?.toString() === dept._id.toString() && e.positionId?.toString() === getPos("Department Head").toString());
            if (!deptHead && Math.random() < 0.2) {
                posName = "Department Head";
            }

            const emp = await createEmp(role, getPos(posName), {
                storeId: store._id,
                storeDepartmentId: dept._id
            });

            // Update References
            await Store.findByIdAndUpdate(store._id, { $push: { employees: emp._id } });
            await StoreDepartment.findByIdAndUpdate(dept._id, { $push: { employees: emp._id } });

            if (posName === "Store Manager") await Store.findByIdAndUpdate(store._id, { $push: { managers: emp._id } });
            if (posName === "Assistant Manager") await Store.findByIdAndUpdate(store._id, { $push: { subManagers: emp._id } });
            if (posName === "Department Head") await StoreDepartment.findByIdAndUpdate(dept._id, { $push: { headOfDepartment: emp._id } });

            // Position History
            if (Math.random() < 0.3) {
                await Employee.findByIdAndUpdate(emp._id, {
                    $push: {
                        positionHistory: {
                            positionId: getPos("Intern"),
                            storeId: store._id,
                            storeDepartmentId: dept._id,
                            from: new Date(2023, 0, 1),
                            to: new Date(2024, 0, 1),
                            reason: "Started as intern"
                        }
                    }
                });
            }
        }

        // 7. Schedules
        console.log("🌱 Creating Schedules...");
        // Create a schedule for the current week for each store department
        const today = new Date();
        const currentYear = today.getFullYear();
        // Simple approx week number
        const getWeek = (d: Date) => {
            const onejan = new Date(d.getFullYear(), 0, 1);
            return Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
        };
        const weekNum = getWeek(today);

        // Find Monday of this week
        const day = today.getDay() || 7;
        if (day !== 1) today.setHours(-24 * (day - 1));
        const monday = new Date(today); // This contains time, but let's assume start of week date
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        for (const sd of allStoreDepts) {
            // Get employees in this dept
            const deptEmps = allEmployees.filter(e => e.storeDepartmentId?.toString() === sd._id.toString());
            if (deptEmps.length === 0) continue;

            const shiftDefs = await ShiftDefinition.find({ storeDepartmentId: sd._id });
            const daysData = [];

            for (let i = 0; i < 7; i++) {
                const currentDate = new Date(monday);
                currentDate.setDate(monday.getDate() + i);

                const dayShifts = [];
                // Create a few shifts per day
                for (const def of shiftDefs) {
                    // Assign random employees
                    const assigned = getRandomSubset(deptEmps, getRandomInt(1, Math.min(3, deptEmps.length)));
                    dayShifts.push({
                        shiftName: def.name,
                        startTime: def.startTime,
                        endTime: def.endTime,
                        breakMinutes: def.breakMinutes || 60,
                        color: def.color,
                        employees: assigned.map(e => e._id),
                        shiftDefinitionId: def._id
                    });
                }
                daysData.push({
                    date: currentDate,
                    shifts: dayShifts
                });
            }

            await Schedule.create({
                storeId: sd.storeId,
                storeDepartmentId: sd._id,
                weekNumber: weekNum,
                year: currentYear,
                dateRange: { startDate: monday, endDate: sunday },
                status: 'published',
                createdBy: deptEmps[0]._id, // First emp as creator
                days: daysData
            });
        }

        console.log("✅ Database seeded successfully!");
        console.log(`Summary:`);
        console.log(`- Stores: ${STORES_COUNT}`);
        console.log(`- Global Depts: ${GLOBAL_DEPTS.length}`);
        console.log(`- Store Depts generated: ${allStoreDepts.length}`);
        console.log(`- Employees: ${allEmployees.length}`);

        process.exit(0);

    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
}

seed();
