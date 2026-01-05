
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
    Notice,
    Note,
    Problem,
    TipsDistribution,
    IEmployee,
} from '../lib/models';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI is not defined");
    process.exit(1);
}

// --- Configuration ---
const CONFIG = {
    STORES_COUNT: 6,
    GLOBAL_DEPTS_NAMES: ["Kitchen", "Front of House", "Bar", "Administration", "Logistics"],
    MIN_STORE_DEPTS: 3,
    TOTAL_EMPLOYEES: 106,
    YEAR_CURRENT: 2025,
    YEAR_NEXT: 2026,
};

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
        console.log("🚀 Starting Comprehensive Seed (v3 Upgrade)...");
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI!);
        console.log("✅ Connected.");

        // 1. Clear Database
        console.log("🔥 Clearing all existing data...");
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
            Notice.deleteMany({}),
            Note.deleteMany({}),
            TipsDistribution.deleteMany({}),
        ]);

        const passwordHash = await bcrypt.hash("password123", 10);

        // 2. Create Company
        console.log("🏢 Creating Company...");
        const company = await Company.create({
            name: "Lagasy Group",
            taxNumber: "500600700",
            address: "123 Innovation Blvd, Tech City",
            totalVacationsPerYear: 22,
            weekStartsOn: "monday",
            active: true
        });

        // 3. Create Global Departments
        console.log("🌍 Creating 5 Global Departments...");
        const globalDeptDocs: any[] = [];
        for (const name of CONFIG.GLOBAL_DEPTS_NAMES) {
            const gd = await GlobalDepartment.create({
                name: name,
                slug: generateSlug(name),
                description: `Global operations for ${name}`,
                active: true,
                hasHead: true
            });
            globalDeptDocs.push(gd);
        }
        await Company.findByIdAndUpdate(company._id, { globalDepartments: globalDeptDocs.map(d => d._id) });

        // 4. Create Positions for Everyone
        console.log("👔 Creating Positions...");
        const positionDocs = await Position.insertMany([
            { name: "Tech Super User", slug: "tech-super", level: 100, isStoreSpecific: false, permissions: ["*"] },
            { name: "Owner", slug: "owner", level: 90, isStoreSpecific: false, permissions: ["owner:all"] },
            { name: "HR Director", slug: "hr-director", level: 85, isStoreSpecific: false, permissions: ["hr:manage"] },
            { name: "Global Dept Head", slug: "global-dept-head", level: 80, isStoreSpecific: false },
            { name: "Global Dept Sub-Head", slug: "global-dept-sub-head", level: 75, isStoreSpecific: false },
            { name: "Store Manager", slug: "store-manager", level: 70, isStoreSpecific: true },
            { name: "Store Dept Head", slug: "store-dept-head", level: 60, isStoreSpecific: true },
            { name: "Store Dept Sub-Head", slug: "store-dept-sub-head", level: 50, isStoreSpecific: true },
            { name: "Senior Staff", slug: "senior-staff", level: 40, isStoreSpecific: true },
            { name: "Staff", slug: "staff", level: 30, isStoreSpecific: true },
            { name: "Junior Staff", slug: "junior-staff", level: 20, isStoreSpecific: true },
            { name: "Intern", slug: "intern", level: 10, isStoreSpecific: true },
        ]);
        const getPos = (name: string) => positionDocs.find(p => p.name === name)!;

        // 5. Create Stores
        console.log(`🏪 Creating ${CONFIG.STORES_COUNT} Stores...`);
        const storeDocs: any[] = [];
        for (let i = 1; i <= CONFIG.STORES_COUNT; i++) {
            const name = `Lagasy Hub #${i}`;
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

        // 6. Create Store Departments (All stores get Kitchen, Bar, Service)
        console.log("🏗️ Creating Store Departments...");
        const allStoreDepts: any[] = [];
        for (const store of storeDocs) {
            for (const gd of globalDeptDocs) {
                const sd = await StoreDepartment.create({
                    storeId: store._id,
                    globalDepartmentId: gd._id,
                    name: gd.name,
                    slug: generateSlug(`${store.name}-${gd.name}`),
                    active: true,
                    positionsAllowed: positionDocs.filter(p => p.isStoreSpecific).map(p => p._id)
                });

                // Create default shifts for this dept
                await ShiftDefinition.insertMany([
                    { name: "Morning", startTime: "08:00", endTime: "16:00", color: "#3b82f6", breakMinutes: 60, storeDepartmentId: sd._id },
                    { name: "Evening", startTime: "16:00", endTime: "00:00", color: "#8b5cf6", breakMinutes: 60, storeDepartmentId: sd._id },
                ]);

                allStoreDepts.push(sd);
            }
        }

        // 7. Create Employees (106)
        console.log(`👥 Creating ${CONFIG.TOTAL_EMPLOYEES} Employees...`);
        const allEmployees: any[] = [];
        const createEmp = async (data: any) => {
            const firstName = data.firstName || faker.person.firstName();
            const lastName = data.lastName || faker.person.lastName();
            const email = data.email || `${firstName.toLowerCase()}.${lastName.toLowerCase()}@lagasy.com`;
            const joinedOn = faker.date.past({ years: 3 });
            const emp = await Employee.create({
                firstName, lastName, email: email.toLowerCase(),
                slug: generateSlug(`${firstName}-${lastName}`),
                password: passwordHash,
                dob: faker.date.birthdate({ min: 18, max: 55, mode: 'age' }),
                joinedOn, phone: faker.phone.number(), nif: faker.string.numeric(9), address: faker.location.streetAddress(),
                roles: data.roles || ["employee"],
                positionId: data.positionId, storeId: data.storeId, storeDepartmentId: data.storeDepartmentId,
                active: true,
                contract: { weeklyHours: 40, employmentType: "Contracted" },
                positionHistory: [{ positionId: data.positionId, from: joinedOn, reason: "Initial Hire" }],
                vacationTracker: { defaultDays: 22, year: 2026, usedDays: 0, rolloverDays: 0 }
            });
            allEmployees.push(emp);
            return emp;
        };

        const tech = await createEmp({ firstName: "Tech", lastName: "Admin", email: "tech@lagasy.com", roles: ["tech", "super_user", "admin"], positionId: getPos("Tech Super User")._id });
        const owner1 = await createEmp({ firstName: "Alice", lastName: "Owner", email: "owner1@lagasy.com", roles: ["owner"], positionId: getPos("Owner")._id });
        const hr1 = await createEmp({ firstName: "Helen", lastName: "HR", email: "hr1@lagasy.com", roles: ["hr"], positionId: getPos("HR Director")._id });

        // Heads & Managers
        for (const gd of globalDeptDocs) {
            const head = await createEmp({ roles: ["department_head"], positionId: getPos("Global Dept Head")._id });
            await GlobalDepartment.findByIdAndUpdate(gd._id, { $push: { departmentHead: head._id } });
        }
        for (const store of storeDocs) {
            const mgr = await createEmp({ storeId: store._id, roles: ["store_manager"], positionId: getPos("Store Manager")._id });
            await Store.findByIdAndUpdate(store._id, { $push: { managers: mgr._id } });
        }
        for (const sd of allStoreDepts) {
            const head = await createEmp({ storeId: sd.storeId, storeDepartmentId: sd._id, roles: ["store_department_head"], positionId: getPos("Store Dept Head")._id });
            await StoreDepartment.findByIdAndUpdate(sd._id, { $push: { headOfDepartment: head._id } });
        }
        while (allEmployees.length < CONFIG.TOTAL_EMPLOYEES) {
            const sd = getRandomElement(allStoreDepts);
            await createEmp({ storeId: sd.storeId, storeDepartmentId: sd._id, roles: ["employee"], positionId: getPos("Staff")._id });
        }

        // Backlinks
        for (const emp of allEmployees) {
            if (emp.storeId) await Store.findByIdAndUpdate(emp.storeId, { $push: { employees: emp._id } });
            if (emp.storeDepartmentId) await StoreDepartment.findByIdAndUpdate(emp.storeDepartmentId, { $push: { employees: emp._id } });
        }

        // 8. Detailed Recipes with Food Cost Logic
        console.log("🍔 Seeding Detailed Recipes...");
        const catKitchen = await Category.create({ name: "Kitchen" });
        const recipeData = [
            {
                name: "Classic Lagasy Burger", description: "Standard juicy beef burger with house sauce.",
                heroImg: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80",
                ingredients: [
                    { name: "Beef Patty", amount: 0.18, unit: "kg", costPerUnit: 12, costForIngredient: 2.16 },
                    { name: "Brioche Bun", amount: 1, unit: "unit", costPerUnit: 0.5, costForIngredient: 0.5 }
                ],
                storingTemperature: "4°C", instructions: ["Toast buns", "Grill patty 4 mins per side", "Assemble with sauce"],
                pvp: 14.50, ivaPercent: 13
            },
            {
                name: "Spicy Chicken Wings", description: "12 pieces of buffalo style wings.",
                heroImg: "https://images.unsplash.com/photo-1527477396000-e27163b481c2?auto=format&fit=crop&w=800&q=80",
                ingredients: [
                    { name: "Chicken Wings", amount: 0.5, unit: "kg", costPerUnit: 6, costForIngredient: 3.0 },
                    { name: "Hot Sauce", amount: 0.05, unit: "kg", costPerUnit: 8, costForIngredient: 0.4 }
                ],
                storingTemperature: "-18°C (Frozen)", instructions: ["Deep fry for 8 mins", "Toss in sauce"],
                pvp: 12.00, ivaPercent: 13
            }
        ];
        for (const r of recipeData) {
            const costTotal = r.ingredients.reduce((acc, i) => acc + i.costForIngredient, 0);
            const pvpSemIva = r.pvp / (1 + r.ivaPercent / 100);
            await Food.create({
                ...r, slug: generateSlug(r.name), category: catKitchen._id, costTotal, pvpSemIva,
                mb: pvpSemIva - costTotal, theoreticalFoodCost: (costTotal / pvpSemIva) * 100,
                isPublished: true, isActive: true, expirationDays: 3, createdBy: owner1._id
            });
        }

        // 9. Extensive Schedules for January 2026
        console.log("📅 Generating January 2026 Schedules for ALL departments...");
        const janWeeks = [1, 2, 3, 4];
        for (const sd of allStoreDepts) {
            const deptEmps = allEmployees.filter(e => e.storeDepartmentId?.toString() === sd._id.toString());
            const shifts = await ShiftDefinition.find({ storeDepartmentId: sd._id });
            const manager = allEmployees.find(e => e.storeId?.toString() === sd.storeId.toString() && e.roles.includes('store_manager')) || owner1;

            for (const w of janWeeks) {
                // In 2026, Jan 5 is the first Monday. 
                // Let's start the first week seeded on Dec 29, 2025 (Monday) 
                // OR Jan 5, 2026. User said "January 2026 schedules". 
                // Let's use Jan 5, 12, 19, 26 as Mondays.
                const start = new Date(2026, 0, 5 + (w - 1) * 7);
                const status = (w === 4) ? 'draft' : (w === 3 ? 'review' : 'published');

                // Shuffle and pick 80% emps
                const activeEmps = getRandomSubset(deptEmps, Math.ceil(deptEmps.length * 0.8));

                const sched = await Schedule.create({
                    storeId: sd.storeId, storeDepartmentId: sd._id, weekNumber: w, year: 2026,
                    slug: generateSlug(`sched-${storeDocs.find(s => s._id.toString() === sd.storeId.toString())?.name || 'store'}-${sd.name}-w${w}`),
                    dateRange: { startDate: start, endDate: new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000) },
                    status, createdBy: manager._id,
                    days: Array.from({ length: 7 }).map((_, dayIdx) => {
                        const dayDate = new Date(start.getTime() + dayIdx * 24 * 60 * 60 * 1000);

                        // Rule: Give 2 consecutive days off. 
                        // Simpler logic: If dayIdx is 0 or 1, some are off. If 5 or 6, some are off.
                        // Better: Each employee gets a fixed 2-day block off per week.
                        const shiftedEmps = activeEmps.filter(e => {
                            const empFingerprint = parseInt(e._id.toString().slice(-2), 16) % 3; // 0, 1, 2
                            const offDays = (empFingerprint === 0) ? [0, 1] : (empFingerprint === 1) ? [1, 2] : [5, 6];
                            return !offDays.includes(dayIdx);
                        });

                        return {
                            date: dayDate,
                            shifts: shifts.map(s => ({
                                shiftName: s.name, startTime: s.startTime, endTime: s.endTime,
                                employees: getRandomSubset(shiftedEmps, Math.ceil(shiftedEmps.length / shifts.length)).map(e => e._id),
                                shiftDefinitionId: s._id
                            }))
                        };
                    })
                });
                if (status === 'rejected' || Math.random() > 0.8) {
                    await Schedule.findByIdAndUpdate(sched._id, { $push: { approvalHistory: { status: 'rejected', changedBy: owner1._id, comment: "Please adjust weekend coverage.", createdAt: new Date() } } });
                }
            }
        }

        // 10. Operational Nuances: Vacations, Absences, Overtime
        console.log("🏥 Seeding Active Operations (Absences & Vacations)...");
        const today = new Date();

        // At least 2 on Vacation today
        for (let i = 0; i < 2; i++) {
            const emp = allEmployees[i + 5]; // picking some managers/heads
            const vReq = await VacationRequest.create({ employeeId: emp._id, requestedFrom: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), requestedTo: new Date(today.getTime() + 5 * 24 * 60 * 60 * 1000), totalDays: 7, status: 'approved', reviewedBy: hr1._id });
            const vRec = await VacationRecord.create({ employeeId: emp._id, from: vReq.requestedFrom, to: vReq.requestedTo, totalDays: 7, year: 2026, approvedBy: hr1._id });
            await Employee.findByIdAndUpdate(emp._id, { $push: { vacations: vRec._id } });
        }

        // At least 3 Absent Today
        const absenceTypes = ['sick', 'unjustified', 'family_leave'];
        for (let i = 20; i < 23; i++) {
            const emp = allEmployees[i];
            const aRec = await AbsenceRecord.create({ employeeId: emp._id, date: today, reason: `Emergency ${absenceTypes[i - 20]}`, type: absenceTypes[i - 20], justification: "Justified", approvedBy: hr1._id });
            await Employee.findByIdAndUpdate(emp._id, { $push: { absences: aRec._id } });
        }

        // Overtime Request
        await OvertimeRequest.create({
            employeeId: allEmployees[30]._id, scheduleId: new Types.ObjectId(), dayDate: today, shiftId: new Types.ObjectId(),
            shiftDetails: { startTime: "08:00", endTime: "16:00", shiftName: "Morning" },
            hoursRequested: 2, reason: "Cleaning overdue", status: 'pending'
        });

        // 11. Historical Tasks (Last Year -> Mid 2025)
        console.log("📝 Seeding Task History...");
        for (let i = 0; i < 15; i++) {
            const isDone = Math.random() > 0.3;
            await Task.create({
                title: `Safety Inspection Q${(i % 4) + 1}`, slug: generateSlug(`task-hist-${i}`),
                description: "Ensure all fire exits are clear.", createdBy: owner1._id,
                assignedTo: [{ type: 'store', id: storeDocs[i % 6]._id }],
                status: isDone ? 'completed' : 'todo', deadline: new Date(2025, i % 6, 15),
                comments: [{ userId: owner1._id, userName: "Alice", text: "Please check the basement exit specifically." }]
            });
        }

        // 12. Notices, Tips & Problems
        console.log("📢 Seeding Notices, Tips & Problems...");
        await Notice.create({ title: "Welcome to 2026!", slug: "welcome-2026", content: "Great year ahead!", targetScope: "global", createdBy: owner1._id });
        await Notice.create({ title: "Kitchen Protocol Update", slug: "kitchen-protocol", content: "New hygiene rules.", targetScope: "department", targetId: globalDeptDocs[0]._id, createdBy: owner1._id });

        // Tips
        for (const store of storeDocs) {
            await TipsDistribution.create({
                storeId: store._id, weekStartDate: new Date(2025, 11, 22), weekEndDate: new Date(2025, 11, 28),
                totalAmount: 450, status: 'finalized', finalizedBy: store.managers[0]
            });
        }

        // Problems
        await Problem.create({ title: "Broken Oven", description: "Oven #2 is not heating.", priority: "high", status: "open", reportedBy: allEmployees[40]._id, storeId: storeDocs[0]._id });
        await Problem.create({ title: "Leaky Tap", description: "Tap in bathroom leaking.", priority: "low", status: "resolved", reportedBy: allEmployees[41]._id, storeId: storeDocs[0]._id, resolutionNotes: "Fixed by maintenance." });

        // 13. System Logs for Activity Feed
        console.log("🪵 Generating Sample Activity Logs...");
        await ActionLog.create({ action: "UPDATE_SCHEDULE", performedBy: owner1._id, storeId: storeDocs[0]._id, details: { week: 1, year: 2026 } });
        await ActionLog.create({ action: "APPROVE_VACATION", performedBy: hr1._id, details: { employee: allEmployees[20].firstName } });
        await ActionLog.create({ action: "CREATE_EMPLOYEE", performedBy: hr1._id, details: { name: "New Hire" } });

        console.log("✅ Advanced Seeding Upgrade Complete!");
        process.exit(0);
    } catch (e) {
        console.error("❌ Seed Failed:", e);
        process.exit(1);
    }
}

seed();
