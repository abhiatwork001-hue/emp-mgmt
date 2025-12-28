
import dotenv from "dotenv";
import mongoose from "mongoose";
import {
    Company, GlobalDepartment, Store, StoreDepartment, Employee,
    Position, Schedule, ShiftDefinition, User,
    ICompany, IGlobalDepartment, IStore, IStoreDepartment, IEmployee, ISchedule
} from "../src/lib/models";
import bcrypt from "bcryptjs";

// Load environment variables
dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("Please define the MONGODB_URI environment variable inside .env.local");
    process.exit(1);
}

async function seed() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI as string);
    console.log("Connected.");

    // 1. Clear Database
    console.log("Clearing database...");
    await Promise.all([
        Company.deleteMany({}),
        GlobalDepartment.deleteMany({}),
        Store.deleteMany({}),
        StoreDepartment.deleteMany({}),
        Employee.deleteMany({}),
        Position.deleteMany({}),
        Schedule.deleteMany({}),
        ShiftDefinition.deleteMany({}),
        // User.deleteMany({}) // User is alias for Employee usually
    ]);
    console.log("Database cleared.");

    // 2. Create Company
    console.log("Creating Company...");
    const company = await Company.create({
        name: "Chick Main Global",
        totalVacationsPerYear: 22,
        weekStartsOn: "monday",
        active: true
    });

    // 3. Create Global Departments
    console.log("Creating Global Departments...");
    const globalDeptNames = ["Kitchen", "Service", "Bar", "Management"];
    const globalDepts: any[] = [];

    for (const name of globalDeptNames) {
        const dept = await GlobalDepartment.create({
            name,
            active: true
        });
        globalDepts.push(dept);
        company.globalDepartments.push(dept._id);
    }
    await company.save();

    // 4. Create Positions
    console.log("Creating Positions...");
    const positions = await Promise.all([
        Position.create({ name: "Store Manager", level: 5 }),
        Position.create({ name: "Assistant Manager", level: 4 }),
        Position.create({ name: "Head Chef", level: 3 }),
        Position.create({ name: "Chef", level: 2 }),
        Position.create({ name: "Waiter", level: 1 }),
        Position.create({ name: "Bartender", level: 2 })
    ]);

    const posMap = {
        manager: positions[0],
        assistant: positions[1],
        headChef: positions[2],
        chef: positions[3],
        waiter: positions[4],
        bartender: positions[5]
    };

    // 5. Create Stores & Store Departments
    console.log("Creating Stores and Store Departments...");
    const stores: any[] = [];
    // We need 5 stores
    for (let i = 1; i <= 5; i++) {
        const store = await Store.create({
            companyId: company._id,
            name: `Chick Branch ${i}`,
            address: `Street ${i}, City`,
            active: true
        });

        // Create Store Departments for each Global Dept
        for (const gDept of globalDepts) {
            await StoreDepartment.create({
                storeId: store._id,
                globalDepartmentId: gDept._id,
                name: gDept.name,
                active: true,
                employees: []
            });
        }

        stores.push(store);
        company.branches.push(store._id);
    }
    await company.save();

    // 6. Create Employees
    console.log("Creating Employees...");
    const employees: any[] = [];
    const passwordHash = await bcrypt.hash("password", 10);

    // Helper to create employee
    const createEmp = async (
        firstName: string, lastName: string, email: string,
        storeIndex: number, deptName: string, pos: any,
        contractType: "Contracted" | "Freelancer" | "Extra" = "Contracted"
    ) => {
        const store = stores[storeIndex];
        const storeDepts = await StoreDepartment.find({ storeId: store._id });
        const storeDept = storeDepts.find(d => d.name === deptName);

        if (!storeDept) {
            console.error(`Dept ${deptName} not found for store ${store.name}`);
            return;
        }

        const emp = await Employee.create({
            firstName,
            lastName,
            email,
            password: passwordHash,
            storeId: store._id,
            storeDepartmentId: storeDept._id,
            positionId: pos._id,
            roles: pos.level >= 4 ? ["Manager"] : ["Employee"],
            contract: {
                weeklyHours: contractType === "Contracted" ? 40 : (contractType === "Extra" ? 0 : 20),
                workingDays: contractType === "Contracted" ? [1, 2, 3, 4, 5] : [5, 6, 0],
                employmentType: contractType,
                vacationAllowed: contractType === "Contracted"
            },
            active: true
        });

        // Link back
        storeDept.employees.push(emp._id);
        if (pos.level >= 5) {
            store.managers.push(emp._id);
            storeDept.headOfDepartment.push(emp._id);
        } else if (pos.level === 4) {
            store.subManagers.push(emp._id);
        }
        store.employees.push(emp._id);
        await storeDept.save();
        await store.save();

        employees.push(emp);
        return emp;
    };

    // Distribute 20 employees across 5 stores
    // Store 1: Fully staffed
    await createEmp("Alice", "Manager", "alice@test.com", 0, "Management", posMap.manager);
    await createEmp("Bob", "Chef", "bob@test.com", 0, "Kitchen", posMap.headChef);
    await createEmp("Charlie", "Cook", "charlie@test.com", 0, "Kitchen", posMap.chef);
    await createEmp("David", "Waiter", "david@test.com", 0, "Service", posMap.waiter);
    await createEmp("Eve", "Bar", "eve@test.com", 0, "Bar", posMap.bartender);

    // Store 2
    await createEmp("Frank", "Manager", "frank@test.com", 1, "Management", posMap.manager);
    await createEmp("Grace", "Chef", "grace@test.com", 1, "Kitchen", posMap.chef);
    await createEmp("Heidi", "Waiter", "heidi@test.com", 1, "Service", posMap.waiter, "Freelancer");

    // Store 3
    await createEmp("Ivan", "Manager", "ivan@test.com", 2, "Management", posMap.manager);
    await createEmp("Judy", "Cook", "judy@test.com", 2, "Kitchen", posMap.chef, "Extra");

    // Store 4
    await createEmp("Kevin", "Manager", "kevin@test.com", 3, "Management", posMap.manager);
    await createEmp("Laura", "Waiter", "laura@test.com", 3, "Service", posMap.waiter);

    // Store 5
    await createEmp("Mallory", "Manager", "mallory@test.com", 4, "Management", posMap.manager);
    await createEmp("Niaj", "Chef", "niaj@test.com", 4, "Kitchen", posMap.headChef);

    // More randoms to fill 20
    await createEmp("Oscar", "Extra", "oscar@test.com", 0, "Service", posMap.waiter, "Extra");
    await createEmp("Peggy", "Freelance", "peggy@test.com", 0, "Bar", posMap.bartender, "Freelancer");
    await createEmp("Quentin", "Cook", "quentin@test.com", 1, "Kitchen", posMap.chef);
    await createEmp("Rupert", "Waiter", "rupert@test.com", 2, "Service", posMap.waiter);
    await createEmp("Sybil", "Bar", "sybil@test.com", 3, "Bar", posMap.bartender);
    await createEmp("Trent", "Chef", "trent@test.com", 4, "Kitchen", posMap.chef);

    console.log(`Created ${employees.length} employees.`);

    // 7. Create Schedule for Store 1 Kitchen
    console.log("Creating Schedule for Store 1 Kitchen...");
    const store1 = stores[0];
    const kitchenDept = await StoreDepartment.findOne({ storeId: store1._id, name: "Kitchen" });
    const kitchenEmployees = await Employee.find({ storeDepartmentId: kitchenDept?._id });

    // Calculate current week
    const today = new Date();
    const currentYear = today.getFullYear();
    const startOfYr = new Date(currentYear, 0, 1);
    const weekNum = Math.ceil((((today.getTime() - startOfYr.getTime()) / 86400000) + startOfYr.getDay() + 1) / 7);

    // Get Date Range for this week
    const getWeekRange = (w: number, y: number) => {
        const d = new Date(y, 0, 1 + (w - 1) * 7);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1);
        const start = new Date(d.setDate(diff));
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        return { start, end };
    };
    const { start, end } = getWeekRange(weekNum, currentYear);

    // Helper to format date YYYY-MM-DD
    const days: any[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        days.push({
            date: d,
            isHoliday: false,
            shifts: [] // Populate?
        });
    }

    // Add some shifts
    if (kitchenEmployees.length > 0) {
        days[1].shifts.push({ // Tuesday
            shiftName: "Morning",
            startTime: "08:00",
            endTime: "16:00",
            breakMinutes: 30,
            employees: [kitchenEmployees[0]._id]
        });
        days[2].shifts.push({ // Wednesday
            shiftName: "Day Off",
            employees: [kitchenEmployees[0]._id]
        });
    }

    await Schedule.create({
        storeId: store1._id,
        storeDepartmentId: kitchenDept?._id,
        weekNumber: weekNum,
        year: currentYear,
        dateRange: { startDate: start, endDate: end },
        status: "draft",
        days: days,
        createdBy: employees[0]._id // Alice
    });

    console.log("Seeding complete!");
    process.exit(0);
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
