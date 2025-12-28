
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import {
    Employee,
    Company,
    Store,
    GlobalDepartment,
    StoreDepartment,
    Role,
    Position,
    Schedule,
    VacationRequest,
    AbsenceRequest
} from "../src/lib/models";

dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("MONGODB_URI is likely not defined in .env.local");
    process.exit(1);
}

const STORES = ["Store A", "Store B", "Store C", "Store D", "Store E"];
const DEPTS = ["Kitchen", "Front of House", "Bar", "Management"];

const POSITIONS = [
    { name: "Store Manager", roles: ["Store Manager"] },
    { name: "Assistant Manager", roles: ["Store Manager"] },
    { name: "Chef", roles: ["Employee"] }, // Kitchen implied by Dept
    { name: "Sous Chef", roles: ["Employee"] },
    { name: "Bartender", roles: ["Employee"] },
    { name: "Server", roles: ["Employee"] },
    { name: "Host", roles: ["Employee"] },
    { name: "Dishwasher", roles: ["Employee"] }
];

async function seed() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI!);
    console.log("Connected.");

    // 1. Wipe Data
    console.log("Wiping database...");
    await Promise.all([
        Employee.deleteMany({}),
        mongoose.model('Company').deleteMany({}),
        Store.deleteMany({}),
        GlobalDepartment.deleteMany({}),
        StoreDepartment.deleteMany({}),
        mongoose.model('Role').deleteMany({}),
        Position.deleteMany({}),
        Schedule.deleteMany({}),
        VacationRequest.deleteMany({}),
        AbsenceRequest.deleteMany({})
    ]);
    console.log("Database wiped.");

    // 2. Global Departments
    console.log("Creating Global Departments...");
    const globalDepts = await Promise.all(DEPTS.map(async (name) => {
        return await GlobalDepartment.create({ name });
    }));
    const deptMap = globalDepts.reduce((acc, dept) => ({ ...acc, [dept.name]: dept }), {} as any);

    // 2.5 Roles
    console.log("Creating Roles...");
    const ROLE_NAMES = ["Store Manager", "Employee", "Kitchen", "Department Head", "Store Department Head", "Owner", "Admin", "HR", "Super User"];
    const createdRoles = await Promise.all(ROLE_NAMES.map(async (name) => {
        // Simple update or create
        return await mongoose.model('Role').create({ name, permissions: [] });
    }));
    const roleMap = createdRoles.reduce((acc: any, role) => ({ ...acc, [role.name]: role._id }), {});

    // 3. Positions
    console.log("Creating Positions...");
    const positions = await Promise.all(POSITIONS.map(async (p) => {
        let deptId = null;
        if (["Chef", "Sous Chef", "Dishwasher"].includes(p.name)) deptId = deptMap["Kitchen"]?._id;
        else if (p.name.includes("Manager")) deptId = deptMap["Management"]?._id;
        else if (p.name === "Bartender") deptId = deptMap["Bar"]?._id;
        else deptId = deptMap["Front of House"]?._id;

        const positionRoleIds = p.roles.map(r => roleMap[r] || roleMap["Employee"]);

        return await Position.create({
            name: p.name,
            departmentId: deptId,
            baseHourlyRate: 15,
            roles: positionRoleIds
        });
    }));
    const posMap = positions.reduce((acc, p) => ({ ...acc, [p.name]: p }), {} as any);

    // 4. Stores & Store Departments
    console.log("Creating Company & Stores...");
    // 4.1 Create Company
    const company = await mongoose.model('Company').create({
        name: "Chick Main Refined",
        taxNumber: "999999999",
        address: "HQ Lisbon",
        active: true
    });

    const stores = [];
    for (const storeName of STORES) {
        const store = await Store.create({
            companyId: company._id,
            name: storeName,
            location: "Lisbon, Portugal",
            contactEmail: `${storeName.replace(/\s/g, "").toLowerCase()}@example.com`
        });

        const storeDepts = await Promise.all(globalDepts.map(async (gd) => {
            return await StoreDepartment.create({
                name: gd.name,
                globalDepartmentId: gd._id,
                storeId: store._id
            });
        }));

        stores.push({ store, storeDepts });
    }

    // 5. Employees
    console.log("Creating ~80 Employees...");
    const hashedPassword = await bcrypt.hash("123456", 10);
    const allDetailEmployees: any[] = [];

    const createUser = async (data: any) => {
        const emp = await Employee.create({
            password: hashedPassword,
            hourlyRate: 15,
            contractType: "Full-Time",
            joiningDate: new Date(),
            ...data
        });
        allDetailEmployees.push(emp);
        return emp;
    };

    // A. Owners (3)
    for (let i = 1; i <= 3; i++) {
        await createUser({
            firstName: `Owner`,
            lastName: `${i}`,
            email: `owner${i}@example.com`,
            roles: ["Owner"]
        });
    }

    // B. Tech (1)
    await createUser({
        firstName: "Tech",
        lastName: "Admin",
        email: "tech@example.com",
        roles: ["Admin", "Super User"]
    });

    // C. HR (2)
    for (let i = 1; i <= 2; i++) {
        await createUser({
            firstName: `HR`,
            lastName: `${i}`,
            email: `hr${i}@example.com`,
            roles: ["HR"]
        });
    }

    // D. Global Dept Heads (4)
    for (const gd of globalDepts) {
        await createUser({
            firstName: `Head`,
            lastName: `${gd.name.replace(/\s/g, "")}`,
            email: `head${gd.name.replace(/\s/g, "").toLowerCase()}@example.com`,
            roles: ["Department Head"],
            globalDepartmentId: gd._id
        });
    }

    // E. Store Level
    for (const { store, storeDepts } of stores) {
        const storeNameClean = store.name.replace(/\s/g, "");

        // 1. Store Manager (1)
        await createUser({
            firstName: `${storeNameClean}`,
            lastName: "Manager1",
            email: `${storeNameClean.toLowerCase()}manager1@example.com`,
            storeId: store._id,
            positionId: posMap["Store Manager"]._id,
            roles: ["Store Manager"],
            storeDepartmentId: storeDepts.find(d => d.name === "Management")?._id
        });

        // 2. Store Dept Heads (4)
        for (const sd of storeDepts) {
            await createUser({
                firstName: `${storeNameClean}`,
                lastName: `Head${sd.name.replace(/\s/g, "")}`,
                email: `${storeNameClean.toLowerCase()}head${sd.name.replace(/\s/g, "").toLowerCase()}@example.com`,
                storeId: store._id,
                storeDepartmentId: sd._id,
                roles: ["Store Department Head"],
                positionId: posMap["Assistant Manager"]._id
            });
        }

        // 3. Regular Employees
        const deptDistribution = [
            { name: "Kitchen", count: 3, pos: "Chef" },
            { name: "Front of House", count: 3, pos: "Server" },
            { name: "Bar", count: 2, pos: "Bartender" },
            { name: "Management", count: 1, pos: "Assistant Manager" }
        ];

        let empCounter = 1;
        for (const dist of deptDistribution) {
            const sd = storeDepts.find(d => d.name === dist.name);
            for (let k = 0; k < dist.count; k++) {
                await createUser({
                    firstName: `${storeNameClean}`,
                    lastName: `Employee${empCounter}`,
                    email: `${storeNameClean.toLowerCase()}employee${empCounter}@example.com`,
                    storeId: store._id,
                    storeDepartmentId: sd?._id,
                    roles: ["Employee"], // Strict role?
                    positionId: posMap[dist.pos]._id
                });
                empCounter++;
            }
        }
    }

    // 6. Generate History (Schedules, Vacations)
    console.log("Generating History & Schedules...");
    const weeks = [-1, 0, 1]; // Last week, This week, Next week
    const today = new Date();

    for (const { store, storeDepts } of stores) {
        for (const dept of storeDepts) {
            const deptEmployees = allDetailEmployees.filter(e => e.storeDepartmentId?.toString() === dept._id.toString());
            if (deptEmployees.length === 0) continue;

            for (const weekOffset of weeks) {
                // Calculate Monday of the target week
                const day = new Date(today);
                const diff = day.getDate() - day.getDay() + (day.getDay() === 0 ? -6 : 1) + (weekOffset * 7); // Adjust to Monday
                const weekStart = new Date(day.setDate(diff));
                weekStart.setHours(0, 0, 0, 0);

                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);

                // Prepare embedded days/shifts
                const days = [];
                for (let d = 0; d < 7; d++) {
                    const currentDay = new Date(weekStart);
                    currentDay.setDate(weekStart.getDate() + d);

                    const dayShifts = [];
                    // Workdays (Mon-Fri)
                    const dayNum = currentDay.getDay(); // 0-6
                    if (dayNum >= 1 && dayNum <= 5) {
                        for (const emp of deptEmployees) {
                            const startHour = 9 + Math.floor(Math.random() * 2);
                            dayShifts.push({
                                shiftName: "Regular",
                                startTime: `${startHour}:00`,
                                endTime: `${startHour + 8}:00`,
                                breakMinutes: 60,
                                color: "#3b82f6",
                                employees: [emp._id],
                            });
                        }
                    }

                    days.push({
                        date: currentDay,
                        shifts: dayShifts
                    });
                }

                await Schedule.create({
                    storeId: store._id,
                    storeDepartmentId: dept._id,
                    weekNumber: getWeekNumber(weekStart),
                    year: weekStart.getFullYear(),
                    dateRange: { startDate: weekStart, endDate: weekEnd },
                    status: 'published',
                    createdBy: deptEmployees[0]?._id, // Assign to someone
                    days: days
                });
            }
        }
    }

    // Generate Vacations/Absences
    for (const emp of allDetailEmployees) {
        if (Math.random() < 0.2) {
            const type = Math.random() > 0.5 ? 'vacation' : 'absence';
            const Model = type === 'vacation' ? VacationRequest : AbsenceRequest;
            await Model.create({
                employeeId: emp._id,
                type: type === 'vacation' ? 'Paid' : 'Sick',
                reason: "Generated by Seed",
                status: 'approved',
                // Generic dates
                date: new Date(),
                requestedFrom: new Date(),
                requestedTo: new Date(new Date().getTime() + 86400000),
                totalDays: 1
            });
        }
    }

    console.log("Seeding complete!");
    process.exit(0);
}

function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
