import dotenv from 'dotenv';
import mongoose, { Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import {
    Company,
    Store,
    GlobalDepartment,
    StoreDepartment,
    Position,
    Employee,
    Schedule,
    ShiftDefinition,
    VacationRecord,
    VacationRequest,
    AbsenceRecord,
    AbsenceRequest,
    ExtraHourRequest,
    OvertimeRequest,
    Task,
    ActionLog,
    Food,
    Category,
    IEmployee,
} from '../lib/models';

// Load env vars
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not defined");
    process.exit(1);
}

// --- Constants ---
const STORES_COUNT = 12;
const GLOBAL_DEPTS = [
    "Kitchen", "Front of House", "Bar", "Logistics", "HR", "Finance",
    "Cleaning", "Marketing", "Security", "IT", "Maintenance",
    "Procurement", "Customer Service", "Events"
];
const MIN_STORE_DEPTS = 6;
const TARGET_TOTAL_EMPLOYEES = 216;

const START_DATE_2025 = new Date(2025, 0, 1);
const END_DATE_2025 = new Date(2025, 11, 31);
const FUTURE_DATE_2026 = new Date(2026, 0, 1);

// --- Helpers ---
const getRandomInt = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomSubset = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

const generateSlug = (text: string) => text.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '') + '-' + Math.floor(Math.random() * 1000);

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
            VacationRecord.deleteMany({}),
            VacationRequest.deleteMany({}),
            AbsenceRecord.deleteMany({}),
            AbsenceRequest.deleteMany({}),
            ExtraHourRequest.deleteMany({}),
            OvertimeRequest.deleteMany({}),
            Task.deleteMany({}),
            ActionLog.deleteMany({}),
            Food.deleteMany({}),
            Category.deleteMany({}),
        ]);

        const passwordHash = await bcrypt.hash("password123", 10);

        // 1. Create Company
        console.log("🌱 Creating Company...");
        const company = await Company.create({
            name: "LaGasy Global",
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
                slug: generateSlug(name),
                description: `Global ${name} department managed at corporate level`,
                active: true,
                hasHead: true
            });
            globalDeptDocs.push(gd);
        }
        await Company.findByIdAndUpdate(company._id, { globalDepartments: globalDeptDocs.map(d => d._id) });

        // 3. Create Positions
        console.log("🌱 Creating Positions...");
        const positionDocs = await Position.insertMany([
            { name: "Tech Admin", slug: "tech-admin", level: 100, isStoreSpecific: false, permissions: ["*"] },
            { name: "Owner", slug: "owner", level: 90, isStoreSpecific: false, permissions: ["admin:all", "owner:all"] },
            { name: "HR Manager", slug: "hr-manager", level: 80, isStoreSpecific: false, permissions: ["hr:manage", "employee:view_all"] },
            { name: "Global Department Head", slug: "global-dept-head", level: 70, isStoreSpecific: false },
            { name: "Global Department Sub-Head", slug: "global-dept-sub-head", level: 65, isStoreSpecific: false },
            { name: "Store Manager", slug: "store-manager", level: 60, isStoreSpecific: true },
            { name: "Assistant Manager", slug: "assistant-manager", level: 55, isStoreSpecific: true },
            { name: "Store Department Head", slug: "store-dept-head", level: 50, isStoreSpecific: true },
            { name: "Store Department Sub-Head", slug: "store-dept-sub-head", level: 45, isStoreSpecific: true },
            { name: "Team Lead", slug: "team-lead", level: 30, isStoreSpecific: true },
            { name: "Staff", slug: "staff", level: 10, isStoreSpecific: true },
            { name: "Intern", slug: "intern", level: 5, isStoreSpecific: true },
        ]);

        const getPos = (name: string) => positionDocs.find(p => p.name === name)!;

        // 4. Create Stores
        console.log("🌱 Creating Stores...");
        const storeDocs: any[] = [];
        for (let i = 1; i <= STORES_COUNT; i++) {
            const name = `Chick City #${i}`;
            const store = await Store.create({
                companyId: company._id,
                name: name,
                slug: generateSlug(name),
                address: faker.location.streetAddress(),
                active: true
            });
            storeDocs.push(store);
        }
        await Company.findByIdAndUpdate(company._id, { branches: storeDocs.map(s => s._id) });

        // 5. Create Store Departments
        console.log("🌱 Creating Store Departments...");
        const allStoreDepts: any[] = [];
        for (const store of storeDocs) {
            const storeGlobalDepts = getRandomSubset(globalDeptDocs, Math.max(MIN_STORE_DEPTS, getRandomInt(MIN_STORE_DEPTS, GLOBAL_DEPTS.length)));
            for (const gd of storeGlobalDepts) {
                const sd = await StoreDepartment.create({
                    storeId: store._id,
                    globalDepartmentId: gd._id,
                    name: gd.name,
                    slug: generateSlug(`${store.name}-${gd.name}`),
                    positionsAllowed: positionDocs.filter(p => p.isStoreSpecific).map(p => p._id),
                    active: true
                });

                // Create Shift Definitions
                await ShiftDefinition.insertMany([
                    { name: "Morning", startTime: "08:00", endTime: "16:00", color: "#FFD700", breakMinutes: 60, storeDepartmentId: sd._id },
                    { name: "Afternoon", startTime: "16:00", endTime: "22:00", color: "#FFA500", breakMinutes: 45, storeDepartmentId: sd._id },
                    { name: "Night", startTime: "22:00", endTime: "06:00", color: "#4B0082", breakMinutes: 60, storeDepartmentId: sd._id },
                ]);

                allStoreDepts.push(sd);
            }
        }

        // 6. Create Employees
        console.log("🌱 Creating Employees...");
        const allEmployees: any[] = [];

        const createEmp = async (data: Partial<IEmployee> & { posName: string, roleNames: string[] }) => {
            const firstName = faker.person.firstName();
            const lastName = faker.person.lastName();
            const email = data.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@lagasy.com`;
            const pos = getPos(data.posName);

            // Realistic Joined Date (some years back)
            const joinedOn = faker.date.past({ years: 4 });

            const emp = await Employee.create({
                firstName,
                lastName,
                email,
                slug: generateSlug(`${firstName}-${lastName}`),
                password: passwordHash,
                dob: faker.date.birthdate({ min: 18, max: 60, mode: 'age' }),
                joinedOn: joinedOn,
                phone: faker.phone.number(),
                nif: faker.string.numeric(9),
                address: faker.location.streetAddress(),
                roles: data.roleNames,
                positionId: pos._id,
                active: true,
                vacationTracker: { defaultDays: 22, year: 2025, usedDays: getRandomInt(0, 15), rolloverDays: getRandomInt(0, 5) },
                contract: {
                    weeklyHours: getRandomElement([40, 35, 20]),
                    workingDays: [1, 2, 3, 4, 5],
                    employmentType: getRandomElement(["Contracted", "Freelancer", "Extra"])
                },
                positionHistory: [
                    { positionId: getPos("Intern")._id, from: joinedOn, to: new Date(joinedOn.getTime() + 1000 * 60 * 60 * 24 * 180), reason: "Initial Hire" },
                    { positionId: pos._id, from: new Date(joinedOn.getTime() + 1000 * 60 * 60 * 24 * 181), reason: "Promotion" }
                ],
                ...data
            });
            allEmployees.push(emp);
            return emp;
        };

        // 6a. Specialized Roles
        console.log("   -> Seed Tech, Owners, HR");
        const tech = await createEmp({ posName: "Tech Admin", roleNames: ["Admin", "Owner"], email: "admin@lagasy.com" });
        const owner1 = await createEmp({ posName: "Owner", roleNames: ["Owner"], email: "owner1@lagasy.com" });
        const owner2 = await createEmp({ posName: "Owner", roleNames: ["Owner"], email: "owner2@lagasy.com" });
        const hr1 = await createEmp({ posName: "HR Manager", roleNames: ["HR"], email: "hr1@lagasy.com" });
        const hr2 = await createEmp({ posName: "HR Manager", roleNames: ["HR"], email: "hr2@lagasy.com" });

        // 6b. Global Heads & Sub-Heads
        console.log("   -> Global Heads & Sub-Heads");
        for (const gd of globalDeptDocs) {
            const head = await createEmp({ posName: "Global Department Head", roleNames: ["GlobalHead"] });
            const subHead = await createEmp({ posName: "Global Department Sub-Head", roleNames: ["GlobalHead"] });
            await GlobalDepartment.findByIdAndUpdate(gd._id, {
                $push: { departmentHead: head._id, subHead: subHead._id }
            });
        }

        // 6c. Store Managers & Assistants
        console.log("   -> Store Managers & Assistants");
        for (const store of storeDocs) {
            const mgr = await createEmp({ posName: "Store Manager", roleNames: ["Manager"], storeId: store._id });
            const asst = await createEmp({ posName: "Assistant Manager", roleNames: ["Manager"], storeId: store._id });
            await Store.findByIdAndUpdate(store._id, {
                $push: { managers: mgr._id, subManagers: asst._id }
            });
        }

        // 6d. Store Dept Heads & Sub-Heads
        console.log("   -> Store Dept Heads & Sub-Heads");
        for (const sd of allStoreDepts) {
            const head = await createEmp({ posName: "Store Department Head", roleNames: ["Employee"], storeId: sd.storeId, storeDepartmentId: sd._id });
            const subHead = await createEmp({ posName: "Store Department Sub-Head", roleNames: ["Employee"], storeId: sd.storeId, storeDepartmentId: sd._id });
            await StoreDepartment.findByIdAndUpdate(sd._id, {
                $push: { headOfDepartment: head._id, subHead: subHead._id }
            });
        }

        // 6e. Fill remaining as Staff
        console.log("   -> Filling remaining Staff up to 216...");
        while (allEmployees.length < TARGET_TOTAL_EMPLOYEES) {
            const sd = getRandomElement(allStoreDepts);
            await createEmp({
                posName: "Staff",
                roleNames: ["Employee"],
                storeId: sd.storeId,
                storeDepartmentId: sd._id
            });
        }

        // Update back-references for containers
        console.log("   -> Updating Store, Department and Company employee lists...");
        for (const emp of allEmployees) {
            if (emp.storeId) {
                await Store.findByIdAndUpdate(emp.storeId, { $push: { employees: emp._id } });
            }
            if (emp.storeDepartmentId) {
                await StoreDepartment.findByIdAndUpdate(emp.storeDepartmentId, { $push: { employees: emp._id } });
            }
            await Company.findByIdAndUpdate(company._id, { $push: { employees: emp._id } });
        }

        // 7. Recipes (Food)
        console.log("🌱 Creating Recipes...");
        const foodCategory = await Category.create({ name: "Main Course" });
        const foods = [
            { name: "Classic Fried Chicken", slug: "classic-fried-chicken", description: "Crispy fried chicken with secret spices" },
            { name: "Spicy Chicken Burger", slug: "spicy-chicken-burger", description: "Hot and spicy burger with buffalo sauce" },
            { name: "Grilled Chicken Salad", slug: "grilled-chicken-salad", description: "Healthy grilled chicken with fresh veggies" },
            { name: "Chicken Wings", slug: "chicken-wings", description: "Buffalo style chicken wings" },
            { name: "Popcorn Chicken", slug: "popcorn-chicken", description: "Bite-sized crispy chicken pieces" }
        ];

        for (const f of foods) {
            await Food.create({
                ...f,
                category: foodCategory._id,
                expirationDays: 3,
                ingredients: [
                    { name: "Chicken", amount: 1, unit: "kg", costPerUnit: 5, costForIngredient: 5 },
                    { name: "Flour", amount: 0.5, unit: "kg", costPerUnit: 1, costForIngredient: 0.5 },
                    { name: "Spices", amount: 0.1, unit: "kg", costPerUnit: 10, costForIngredient: 1 }
                ],
                costTotal: 6.5,
                pvp: 15,
                ivaPercent: 23,
                isActive: true,
                isPublished: true,
                createdBy: owner1._id
            });
        }

        // 8. Schedules & Logs
        console.log("🌱 Creating Schedules & Audit Logs...");
        const currentDate = new Date();
        const startOfYear = new Date(2025, 0, 1);

        // Seed 1 department per store for the WHOLE YEAR 2025
        for (const store of storeDocs) {
            const sd = allStoreDepts.find(d => d.storeId.toString() === store._id.toString());
            if (!sd) continue;

            const deptEmps = allEmployees.filter(e => e.storeDepartmentId?.toString() === sd._id.toString());
            if (deptEmps.length === 0) continue;

            const shiftDefs = await ShiftDefinition.find({ storeDepartmentId: sd._id });

            for (let w = 1; w <= 52; w++) {
                const startDate = new Date(2025, 0, (w - 1) * 7 + 1);
                const endDate = new Date(startDate);
                endDate.setDate(startDate.getDate() + 6);

                const status = (startDate < currentDate) ? 'published' : (w < 50 ? 'approved' : 'draft');

                const schedule = await Schedule.create({
                    storeId: store._id,
                    storeDepartmentId: sd._id,
                    weekNumber: w,
                    year: 2025,
                    slug: generateSlug(`sched-${store._id}-${sd.name}-w${w}`),
                    dateRange: { startDate, endDate },
                    status: status,
                    createdBy: deptEmps[0]._id,
                    days: Array.from({ length: 7 }).map((_, i) => ({
                        date: new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000),
                        shifts: [{
                            shiftName: "Morning",
                            startTime: "08:00",
                            endTime: "16:00",
                            employees: [deptEmps[0]._id],
                            shiftDefinitionId: shiftDefs[0]._id
                        }]
                    }))
                });

                // Update Employee Back-references
                for (const empId of [deptEmps[0]._id]) {
                    await Employee.findByIdAndUpdate(empId, { $push: { schedules: schedule._id } });
                }

                if (status === 'published' || status === 'approved') {
                    await ActionLog.create({
                        action: "SCHEDULE_APPROVED",
                        performedBy: owner1._id,
                        storeId: store._id,
                        targetId: schedule._id,
                        targetModel: "Schedule",
                        details: { week: w, year: 2025, approvedBy: 'Owner' }
                    });
                }
            }
        }

        // 9. Vacation, Absence, Overtime
        console.log("🌱 Creating Vacation & Absence history...");
        for (const emp of allEmployees.slice(0, 100)) {
            // Historical Absence
            if (Math.random() < 0.3) {
                const rec = await AbsenceRecord.create({
                    employeeId: emp._id,
                    date: faker.date.past({ years: 1 }),
                    type: getRandomElement(["sick", "personal"]),
                    reason: "Not feeling well",
                    justification: "Justified",
                    approvedBy: hr1._id
                });
                await Employee.findByIdAndUpdate(emp._id, { $push: { absences: rec._id } });
            }

            // Future Vacation Request (Approved)
            if (Math.random() < 0.2) {
                const req = await VacationRequest.create({
                    employeeId: emp._id,
                    requestedFrom: new Date(2026, 6, 1),
                    requestedTo: new Date(2026, 6, 14),
                    totalDays: 14,
                    status: "approved",
                    comments: "Summer vacation",
                    reviewedBy: hr1._id,
                    reviewedAt: new Date()
                });
                // Create the record too
                const rec = await VacationRecord.create({
                    employeeId: emp._id,
                    from: req.requestedFrom,
                    to: req.requestedTo,
                    totalDays: req.totalDays,
                    year: 2026,
                    approvedBy: hr1._id
                });
                await Employee.findByIdAndUpdate(emp._id, { $push: { vacations: rec._id } });
            }

            // Pending Vacation Request
            if (Math.random() < 0.2) {
                await VacationRequest.create({
                    employeeId: emp._id,
                    requestedFrom: new Date(2026, 10, 20),
                    requestedTo: new Date(2026, 11, 2),
                    totalDays: 12,
                    status: "pending",
                    comments: "End of year trip"
                });
            }

            // Rejected Vacation Request
            if (Math.random() < 0.1) {
                await VacationRequest.create({
                    employeeId: emp._id,
                    requestedFrom: new Date(2026, 3, 1),
                    requestedTo: new Date(2026, 3, 7),
                    totalDays: 7,
                    status: "rejected",
                    comments: "Too much work during spring peak",
                    reviewedBy: hr2._id,
                    reviewedAt: new Date()
                });
            }

            // Overtime Requests (Realistic)
            if (Math.random() < 0.4) {
                await OvertimeRequest.create({
                    employeeId: emp._id,
                    scheduleId: new Types.ObjectId(), // Virtual for demo
                    dayDate: new Date(),
                    shiftId: new Types.ObjectId(),
                    shiftDetails: { startTime: "08:00", endTime: "16:00", shiftName: "Morning" },
                    hoursRequested: getRandomElement([1, 1.5, 2, 4]),
                    reason: "Extra busy today",
                    status: getRandomElement(["approved", "pending", "rejected"]),
                    reviewedBy: owner1._id, // Picking some manager ref
                    rejectionReason: "Not needed today"
                });
            }
        }

        // 10. Tasks
        console.log("🌱 Creating many Tasks...");
        for (let i = 0; i < 20; i++) {
            await Task.create({
                title: faker.company.catchPhrase(),
                slug: generateSlug(`task-${i}`),
                description: faker.lorem.paragraph(),
                createdBy: hr1._id,
                assignedTo: [{ type: 'store', id: getRandomElement(storeDocs)._id }],
                priority: getRandomElement(['low', 'medium', 'high']),
                status: getRandomElement(['todo', 'in_progress', 'completed']),
                deadline: faker.date.future()
            });
        }

        console.log("✅ Database seeded successfully with high realism!");
        console.log(`Summary:`);
        console.log(`- Stores: ${STORES_COUNT}`);
        console.log(`- Employees: ${allEmployees.length}`);
        console.log(`- Full Year Schedules: Created for 1 dept per store`);
        console.log(`- Users for Testing:`);
        console.log(`  - Admin/Tech: admin@lagasy.com / password123`);
        console.log(`  - Owner: owner1@lagasy.com / password123`);
        console.log(`  - HR: hr1@lagasy.com / password123`);

        process.exit(0);

    } catch (error) {
        console.error("❌ Seeding failed:", error);
        process.exit(1);
    }
}

seed();
