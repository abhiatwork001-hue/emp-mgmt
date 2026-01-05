import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { faker } from "@faker-js/faker";
import {
    Company,
    GlobalDepartment,
    Store,
    StoreDepartment,
    Employee,
    Position,
    Role,
    Schedule,
    ShiftDefinition,
    VacationRecord,
    AbsenceRecord,
    Task,
    VacationRequest,
    AbsenceRequest,
    Note,
    Notice,
    Food,
    Category,
    Problem
} from "../src/lib/models";
import { slugify } from "../src/lib/utils";

const STORE_COUNT = 6;
const TOTAL_EMPLOYEES = 106;
const GLOBAL_DEPTS = [
    { name: "Management", slug: "management" },
    { name: "Kitchen", slug: "kitchen" },
    { name: "Front Office", slug: "front-office" },
    { name: "Cleaning & Service", slug: "cleaning-service" },
    { name: "Logistics", slug: "logistics" }
];

async function seed() {
    console.log("🚀 Starting Massive Seed v4...");
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
    await mongoose.connect(process.env.MONGODB_URI);

    console.log("🧹 Wiping old data...");
    await Promise.all([
        Company.deleteMany({}),
        GlobalDepartment.deleteMany({}),
        Store.deleteMany({}),
        StoreDepartment.deleteMany({}),
        Employee.deleteMany({}),
        Position.deleteMany({}),
        Role.deleteMany({}),
        Schedule.deleteMany({}),
        ShiftDefinition.deleteMany({}),
        VacationRecord.deleteMany({}),
        AbsenceRecord.deleteMany({}),
        Task.deleteMany({}),
        VacationRequest.deleteMany({}),
        AbsenceRequest.deleteMany({}),
        Note.deleteMany({}),
        Notice.deleteMany({}),
        Food.deleteMany({}),
        Category.deleteMany({}),
        Problem.deleteMany({})
    ]);

    // 1. Roles
    console.log("🎭 Creating Roles...");
    const rolesData = [
        { name: "super_user", permissions: ["manage_system", "view_logs", "manage_store"], description: "Super User" },
        { name: "owner", permissions: ["manage_store", "manage_finance", "view_reports"], description: "Owner" },
        { name: "admin", permissions: ["manage_system", "manage_users"], description: "Administrator" },
        { name: "hr", permissions: ["manage_employees", "approve_vacations"], description: "Human Resources" },
        { name: "tech", permissions: ["manage_system", "view_logs"], description: "Technical Support" },
        { name: "store_manager", permissions: ["manage_store", "create_schedule"], description: "Store Manager" },
        { name: "department_head", permissions: ["manage_department"], description: "Global Department Head" },
        { name: "store_department_head", permissions: ["manage_store_department", "create_schedule"], description: "Store Department Head" },
        { name: "employee", permissions: ["view_schedule", "request_vacation"], description: "Regular Employee" }
    ];
    const rolesMap = new Map();
    for (const r of rolesData) {
        const doc = await Role.create(r);
        rolesMap.set(r.name, doc);
    }

    // 2. Company
    const company = await Company.create({
        name: "Chick Ecosystems Global",
        taxNumber: "512345678",
        address: "Av. da Liberdade 100, Lisboa",
        totalVacationsPerYear: 22,
        active: true
    });

    // 3. Global Departments
    console.log("🏢 Creating Global Departments...");
    const gDeptsDocs = [];
    for (const gd of GLOBAL_DEPTS) {
        const doc = await GlobalDepartment.create({ ...gd, hasHead: true, active: true });
        gDeptsDocs.push(doc);
    }
    await company.updateOne({ $set: { globalDepartments: gDeptsDocs.map(d => d._id) } });

    // 4. Stores & Store Departments
    console.log("🏪 Creating 6 Stores and Departments...");
    const stores = [];
    const allStoreDepts = [];
    const storeNames = ["Branch North", "Branch South", "Branch East", "Branch West", "Branch Central", "Branch Coastal"];
    for (let i = 0; i < STORE_COUNT; i++) {
        const store = await Store.create({
            companyId: company._id,
            name: storeNames[i],
            slug: slugify(storeNames[i]),
            address: faker.location.streetAddress() + ", Portugal",
            active: true
        });
        stores.push(store);

        // Sub-depts: Kitchen, Front, Cleaning
        const subDepts = ["Kitchen", "Front Office", "Cleaning & Service"];
        for (const sdName of subDepts) {
            const gDept = gDeptsDocs.find(d => d.name === sdName);
            const sd = await StoreDepartment.create({
                storeId: store._id,
                globalDepartmentId: gDept?._id,
                name: sdName,
                slug: `${store.slug}-${slugify(sdName)}`,
                active: true
            });
            allStoreDepts.push(sd);
        }
    }

    // 5. Positions
    const posTech = await Position.create({ name: "Tech Lead", slug: "tech-lead", roles: [rolesMap.get("tech")._id] });
    const posOwner = await Position.create({ name: "Owner", slug: "owner", roles: [rolesMap.get("owner")._id] });
    const posHR = await Position.create({ name: "HR Manager", slug: "hr-manager", roles: [rolesMap.get("hr")._id] });
    const posGH = await Position.create({ name: "Global Head", slug: "global-head", roles: [rolesMap.get("department_head")._id] });
    const posSM = await Position.create({ name: "Store Manager", slug: "store-manager", roles: [rolesMap.get("store_manager")._id] });
    const posSH = await Position.create({ name: "Shift Leader", slug: "shift-leader", roles: [rolesMap.get("store_department_head")._id] });
    const posEmp = await Position.create({ name: "Staff", slug: "staff", roles: [rolesMap.get("employee")._id] });

    // 6. Employees
    console.log(`👥 Creating ${TOTAL_EMPLOYEES} Employees...`);
    const passwordHash = await bcrypt.hash("Chick2026!", 10);
    const emps = [];

    const createEmp = async (data: any) => {
        const firstName = data.firstName || faker.person.firstName();
        const lastName = data.lastName || faker.person.lastName();
        const email = data.email || faker.internet.email({ firstName, lastName }).toLowerCase();
        const e = await Employee.create({
            ...data,
            firstName,
            lastName,
            email,
            password: passwordHash,
            slug: slugify(`${firstName} ${lastName}`) + "-" + faker.string.alphanumeric(4),
            dob: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
            nif: faker.string.numeric(9),
            joinedOn: faker.date.past({ years: 3 }),
            active: true,
            vacationTracker: { defaultDays: 22, year: 2026, remainingDays: 22 }
        });
        return e;
    };

    // A. Tech (1)
    emps.push(await createEmp({ email: "tech@lagasy.com", roles: ["tech"], positionId: posTech._id }));
    // B. Owners (2)
    emps.push(await createEmp({ email: "owner1@lagasy.com", roles: ["owner"], positionId: posOwner._id }));
    emps.push(await createEmp({ email: "owner2@lagasy.com", roles: ["owner"], positionId: posOwner._id }));
    // C. HR (2)
    emps.push(await createEmp({ email: "hr1@lagasy.com", roles: ["hr"], positionId: posHR._id }));
    emps.push(await createEmp({ email: "hr2@lagasy.com", roles: ["hr"], positionId: posHR._id }));

    // D. Global Dept Heads (5)
    for (const gd of gDeptsDocs) {
        const head = await createEmp({ roles: ["department_head"], positionId: posGH._id });
        await gd.updateOne({ $push: { departmentHead: head._id } });
        emps.push(head);
    }

    // E. Store Managers (6)
    for (const store of stores) {
        const mgr = await createEmp({ roles: ["store_manager"], positionId: posSM._id, storeId: store._id });
        await store.updateOne({ $push: { managers: mgr._id } });
        emps.push(mgr);
    }

    // F. Store Dept Heads (18 - 3 per store)
    for (const sd of allStoreDepts) {
        const head = await createEmp({ roles: ["store_department_head"], positionId: posSH._id, storeId: sd.storeId, storeDepartmentId: sd._id });
        await sd.updateOne({ $push: { headOfDepartment: head._id } });
        emps.push(head);
    }

    // G. Regular Employees (72 - Distributed)
    const empTypes = ["Contracted", "Freelancer"];
    while (emps.length < TOTAL_EMPLOYEES) {
        const sd = faker.helpers.arrayElement(allStoreDepts);
        const type = faker.helpers.arrayElement(empTypes);
        const isPartTime = Math.random() > 0.7;
        const emp = await createEmp({
            roles: ["employee"],
            positionId: posEmp._id,
            storeId: sd.storeId,
            storeDepartmentId: sd._id,
            contract: {
                weeklyHours: isPartTime ? 20 : 40,
                employmentType: type,
                vacationAllowed: type === "Contracted"
            }
        });
        await sd.updateOne({ $push: { employees: emp._id } });
        emps.push(emp);
    }

    // 7. Operational Data
    console.log("📊 Generating Operational Data (Tasks, Schedules, etc.)...");

    // A. Schedules for Jan 2026
    for (const sd of allStoreDepts) {
        const deptEmps = await Employee.find({ storeDepartmentId: sd._id }).select("_id");
        for (let w = 1; w <= 4; w++) {
            const startDate = new Date(2026, 0, (w - 1) * 7 + 5); // Start around Mondays
            const days = [];
            for (let d = 0; d < 7; d++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + d);
                days.push({
                    date,
                    shifts: [{
                        shiftName: "General Shift",
                        startTime: "09:00",
                        endTime: "18:00",
                        employees: deptEmps.map(e => e._id),
                        color: "#4f46e5"
                    }]
                });
            }
            await Schedule.create({
                storeId: sd.storeId,
                storeDepartmentId: sd._id,
                slug: `2026-w${w}-${sd.slug}`,
                weekNumber: w,
                year: 2026,
                dateRange: { startDate, endDate: new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000) },
                status: "published",
                days,
                createdBy: emps[0]._id
            });
        }
    }

    // B. Tasks (History + Future)
    for (let i = 0; i < 50; i++) {
        const title = faker.hacker.phrase().substring(0, 50);
        await Task.create({
            title,
            slug: slugify(title) + "-" + faker.string.alphanumeric(4),
            description: faker.lorem.paragraph(),
            status: faker.helpers.arrayElement(["todo", "in_progress", "completed"]),
            deadline: faker.date.between({ from: "2025-01-01", to: "2026-06-30" }),
            priority: faker.helpers.arrayElement(["low", "medium", "high"]),
            createdBy: faker.helpers.arrayElement(emps)._id,
            assignedTo: [{ type: "individual", id: faker.helpers.arrayElement(emps)._id }]
        });
    }

    // C. Recipes
    console.log("🍳 Creating Recipes...");
    const catFood = await Category.create({ name: "Food" });
    const recipes = ["Classic Burger", "Vegan Wrap", "Grilled Chicken", "Caesar Salad", "Spaghetti Carbonara"];
    for (const name of recipes) {
        await Food.create({
            name,
            slug: slugify(name),
            category: catFood._id,
            description: "A delicious " + name,
            instructions: ["Step 1: Prep ingredients.", "Step 2: Cook.", "Step 3: Serve."],
            expirationDays: 3,
            ingredients: [
                { name: "Main Ingredient", amount: 200, unit: "g", costPerUnit: 0.0125, costForIngredient: 2.5 },
                { name: "Side Ingredient", amount: 50, unit: "g", costPerUnit: 0.01, costForIngredient: 0.5 }
            ],
            costTotal: 3.0,
            pvp: 12.99,
            yieldAmount: 1,
            isGlobal: true,
            isActive: true,
            isPublished: true,
            createdBy: emps[0]._id
        });
    }

    // D. Vacations & Absences
    for (let i = 0; i < 20; i++) {
        const emp = faker.helpers.arrayElement(emps);
        // Past record
        await VacationRecord.create({
            employeeId: emp._id,
            from: new Date(2025, 5, 10),
            to: new Date(2025, 5, 20),
            totalDays: 10,
            year: 2025
        });
        // Future request
        await VacationRequest.create({
            employeeId: emp._id,
            requestedFrom: new Date(2026, 6, 1),
            requestedTo: new Date(2026, 6, 15),
            totalDays: 14,
            status: "pending"
        });
    }

    console.log("✅ Seed v4 Complete!");
    process.exit(0);
}

seed().catch(err => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
});
