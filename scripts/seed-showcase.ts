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
    IExtraHourRequest
} from "../src/lib/models";
import { slugify } from "../src/lib/utils";

// --- Settings ---
const STORE_COUNT = 10;
const GLOBAL_DEPT_COUNT = 14;
const STORE_DEPTS_PER_STORE = 7;
const TOTAL_EMPLOYEES = 216;

const ROLES_DISTIBUTION = {
    owner: 2,
    hr: 2,
    tech: 1,
    // total fixed: 5. 
    // Computed:
    // Store Managers: 10 (1 per store)
    // Store Dept Heads: 70 (1 per store dept)
    // Global Dept Heads: 14 (1 per global dept)
    // Total Heads: 94
    // Remaining for regular staff: 216 - 5 - 94 = 117
};

async function seed() {
    console.log("Connecting to MongoDB...");
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI is not defined");
    }
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected.");

    console.log("Wiping database...");
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
        AbsenceRequest.deleteMany({})
    ]);
    console.log("Database wiped.");

    // --- 1. Roles ---
    console.log("Creating Roles...");
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

    // --- 2. Company ---
    console.log("Creating Company...");
    const company = await Company.create({
        name: "Chick Ecosystems Ltd.",
        taxNumber: "999888777",
        address: "123 Innovation Drive, Tech City",
        totalVacationsPerYear: 22,
        active: true
    });

    // --- 3. Global Departments ---
    console.log(`Creating ${GLOBAL_DEPT_COUNT} Global Departments...`);
    const globalDepts = [];
    for (let i = 0; i < GLOBAL_DEPT_COUNT; i++) {
        const name = faker.commerce.department() + (i > 5 ? ` ${i}` : ""); // Ensure uniqueish
        const dept = await GlobalDepartment.create({
            name: name,
            slug: faker.helpers.slugify(name).toLowerCase(),
            description: faker.company.catchPhrase(),
            hasHead: true,
            active: true
        });
        globalDepts.push(dept);
    }
    await company.updateOne({ $set: { globalDepartments: globalDepts.map(d => d._id) } });

    // --- 4. Stores ---
    console.log(`Creating ${STORE_COUNT} Stores...`);
    const stores = [];
    for (let i = 0; i < STORE_COUNT; i++) {
        const city = faker.location.city();
        const street = faker.location.street();
        const storeName = `${city} Branch`;
        const store = await Store.create({
            companyId: company._id,
            name: storeName,
            slug: faker.helpers.slugify(storeName).toLowerCase() + `-${i}`,
            address: `${street}, ${city}`,
            minEmployees: 10,
            active: true
        });
        stores.push(store);
    }
    await company.updateOne({ $set: { branches: stores.map(s => s._id) } });

    // --- 5. Store Departments ---
    console.log(`Creating Store Departments (${STORE_COUNT} * ${STORE_DEPTS_PER_STORE})...`);
    const allStoreDepts = [];
    for (const store of stores) {
        // Pick 7 global depts to instantiate in this store
        const deptSubset = globalDepts.slice(0, STORE_DEPTS_PER_STORE);
        for (const gd of deptSubset) {
            const sd = await StoreDepartment.create({
                storeId: store._id,
                globalDepartmentId: gd._id,
                name: gd.name, // Keeping same name
                slug: `${store.slug}-${gd.slug}`,
                minEmployees: 2,
                targetEmployees: 5,
                active: true
            });
            allStoreDepts.push(sd);
        }
    }

    // --- 6. Positions ---
    console.log("Creating Positions...");
    const positions = [];
    const positionsNames = ["Junior Staff", "Senior Staff", "Specialist", "Assistant", "Coordinator"];
    for (const pName of positionsNames) {
        const pos = await Position.create({
            name: pName,
            slug: slugify(pName),
            roles: [rolesMap.get("employee")._id],
            level: 1,
            active: true
        });
        positions.push(pos);
    }
    // Specific positions for heads
    const managerPos = await Position.create({ name: "Manager", slug: slugify("Manager"), roles: [rolesMap.get("store_manager")._id], level: 3 });
    const headPos = await Position.create({ name: "Department Head", slug: slugify("Department Head"), roles: [rolesMap.get("department_head")._id], level: 3 });
    const storeHeadPos = await Position.create({ name: "Shift Leader", slug: slugify("Shift Leader"), roles: [rolesMap.get("store_department_head")._id], level: 2 });
    const ownerPos = await Position.create({ name: "Owner", slug: slugify("Owner"), roles: [rolesMap.get("owner")._id], level: 5 });
    const hrPos = await Position.create({ name: "HR Officer", slug: slugify("HR Officer"), roles: [rolesMap.get("hr")._id], level: 4 });
    const techPos = await Position.create({ name: "Tech Lead", slug: slugify("Tech Lead"), roles: [rolesMap.get("tech")._id], level: 4 });

    // --- 7. Employees ---
    console.log(`Creating ${TOTAL_EMPLOYEES} Employees...`);
    const allEmployees: any[] = [];
    const passwordHash = await bcrypt.hash("123456", 10);

    const createEmp = async (roleName: string, positionId: any, storeId?: any, deptId?: any, employmentType: string = "Contracted") => {
        const firstName = faker.person.firstName();
        const lastName = faker.person.lastName();
        const email = faker.internet.email({ firstName, lastName }).toLowerCase();

        const emp = await Employee.create({
            firstName,
            lastName,
            slug: slugify(`${firstName} ${lastName}`) + "-" + faker.string.alphanumeric(4),
            email,
            password: passwordHash,
            dob: faker.date.birthdate({ min: 18, max: 60, mode: 'age' }),
            phone: faker.phone.number(),
            address: faker.location.streetAddress(),
            joinedOn: faker.date.past({ years: 5 }),
            roles: [roleName],
            storeId,
            storeDepartmentId: deptId,
            positionId,
            contract: {
                weeklyHours: roleName === "employee" && Math.random() > 0.7 ? 20 : 40,
                workingDays: [1, 2, 3, 4, 5],
                employmentType: employmentType,
                vacationAllowed: employmentType === "Contracted"
            },
            active: true,
            vacationTracker: {
                defaultDays: 22,
                year: new Date().getFullYear(),
                remainingDays: 22 // Logical default
            }
        });
        return emp;
    };

    // A. Special Roles (5)
    // Owners (2)
    for (let i = 0; i < 2; i++) allEmployees.push(await createEmp("owner", ownerPos._id));
    // HR (2)
    for (let i = 0; i < 2; i++) allEmployees.push(await createEmp("hr", hrPos._id));
    // Tech (1)
    for (let i = 0; i < 1; i++) allEmployees.push(await createEmp("tech", techPos._id));

    // B. Store Managers (10)
    for (const store of stores) {
        const mgr = await createEmp("store_manager", managerPos._id, store._id);
        allEmployees.push(mgr);
        await store.updateOne({ $push: { managers: mgr._id } });
    }

    // C. Global Dept Heads (14)
    for (const gd of globalDepts) {
        const head = await createEmp("department_head", headPos._id); // Not attached to a store yet? Or HQ?
        allEmployees.push(head);
        await gd.updateOne({ $push: { departmentHead: head._id } });
    }

    // D. Store Dept Heads (70) -- attached to Store Depts
    // Also we track remaining slots.
    let remainingEmployees = TOTAL_EMPLOYEES - allEmployees.length;
    // We have 70 Store Depts. We MUST put a head in each.
    // Wait, 216 - 5 - 10 - 14 = 187.
    // 187 > 70. So we can put 1 head per store dept.

    // Flatten store depts for easier iteration
    // Iterate stores again to access their depts logic
    // Actually I can just query StoreDepartment.
    const fetchedStoreDepts = await StoreDepartment.find({});

    for (const sd of fetchedStoreDepts) {
        const head = await createEmp("store_department_head", storeHeadPos._id, sd.storeId, sd._id);
        allEmployees.push(head);
        await StoreDepartment.findByIdAndUpdate(sd._id, { $push: { headOfDepartment: head._id } });
        remainingEmployees--;
    }

    // E. Regular Employees (Rest ~117)
    // Distributed randomly across Store Departments
    const employmentTypes = ["Contracted", "Part-Time", "Freelancer"];

    while (remainingEmployees > 0) {
        const randomSD = fetchedStoreDepts[Math.floor(Math.random() * fetchedStoreDepts.length)];
        const randomPos = positions[Math.floor(Math.random() * positions.length)];
        const empType = employmentTypes[Math.floor(Math.random() * employmentTypes.length)];

        // Ensure "Freelancer" or "PartTime" logic in db (using "Contracted" mostly for simplicity or as requested)
        // User asked: "put some as part timer, freelancer and contracted"
        const type = empType === "Part-Time" ? "Contracted" : empType; // Map part-time to contracted with less hours?
        // Actually schema supports "Contracted", "Freelancer", "Extra".

        const emp = await createEmp(
            "employee",
            randomPos._id,
            randomSD.storeId,
            randomSD._id,
            empType === "Part-Time" ? "Contracted" : (empType === "Freelancer" ? "Freelancer" : "Contracted")
        );
        // Correct weekly hours for part time inside createEmp if needed
        if (empType === "Part-Time") {
            emp.contract!.weeklyHours = 20;
            await emp.save();
        }

        allEmployees.push(emp);
        await StoreDepartment.findByIdAndUpdate(randomSD._id, { $push: { employees: emp._id } });
        remainingEmployees--;
    }

    // --- 8. Generate History & Data ---
    console.log("Generating Histories (Vacation, Absence, Position, Tasks, etc.)...");

    const admin = allEmployees.find(e => e.roles.includes("tech")) || allEmployees[0];

    for (const emp of allEmployees) {
        const isOld = Math.random() > 0.3; // 70% have history

        // Position History
        if (isOld) {
            await Employee.findByIdAndUpdate(emp._id, {
                $push: {
                    positionHistory: {
                        positionId: emp.positionId,
                        storeId: emp.storeId,
                        storeDepartmentId: emp.storeDepartmentId,
                        reason: "Initial Hire",
                        from: faker.date.past({ years: 2 }),
                        to: faker.date.recent({ days: 100 }),
                        assignedBy: admin._id
                    }
                }
            });
        }

        // Vacations
        // 1-3 Past records
        const numVacs = faker.number.int({ min: 1, max: 3 });
        for (let k = 0; k < numVacs; k++) {
            const start = faker.date.past({ years: 1 });
            const end = new Date(start);
            end.setDate(start.getDate() + 5);
            await VacationRecord.create({
                employeeId: emp._id,
                year: start.getFullYear(),
                from: start,
                to: end,
                totalDays: 5,
                approvedBy: admin._id
            });
        }

        // Absences
        if (Math.random() > 0.6) {
            const date = faker.date.recent({ days: 60 });
            await AbsenceRecord.create({
                employeeId: emp._id,
                date: date,
                type: 'sick',
                reason: 'Medical',
                approvedBy: admin._id
            });
        }

        // Tasks
        const numTasks = faker.number.int({ min: 0, max: 5 });
        for (let k = 0; k < numTasks; k++) {
            const status = faker.helpers.arrayElement(['todo', 'in_progress', 'completed']);
            const deadline = faker.date.soon({ days: 30 });
            const isOverdue = Math.random() > 0.8;

            const title = faker.hacker.verb() + " " + faker.hacker.noun();
            await Task.create({
                title: title,
                slug: slugify(title) + "-" + faker.string.alphanumeric(4),
                description: faker.lorem.sentence(),
                createdBy: admin._id,
                assignedTo: [{ type: 'individual', id: emp._id }],
                status: isOverdue && status !== 'completed' ? 'todo' : status,
                deadline: isOverdue ? faker.date.recent({ days: 10 }) : deadline,
                priority: faker.helpers.arrayElement(['low', 'medium', 'high'])
            });
        }
    }

    // --- 9. Schedules & Overtime ---
    console.log("Generating Schedules...");
    const currentWeekStart = new Date();
    // Align to Monday
    const dy = currentWeekStart.getDay();
    const diff = currentWeekStart.getDate() - dy + (dy === 0 ? -6 : 1);
    currentWeekStart.setDate(diff);

    // Create schedule for each Store Department
    for (const sd of fetchedStoreDepts) {
        // Find employees in this dept
        const deptEmps = await Employee.find({ storeDepartmentId: sd._id });
        if (deptEmps.length === 0) continue;

        const days = [];
        for (let d = 0; d < 7; d++) {
            const dayDate = new Date(currentWeekStart);
            dayDate.setDate(currentWeekStart.getDate() + d);

            const shifts = [];
            // Create Morning and Evening shifts
            shifts.push({
                shiftName: "Morning",
                startTime: "09:00",
                endTime: "17:00",
                color: "#16a34a",
                employees: deptEmps.slice(0, Math.ceil(deptEmps.length / 2)).map(e => e._id),
                isOvertime: false
            });
            shifts.push({
                shiftName: "Evening",
                startTime: "17:00",
                endTime: "23:00",
                color: "#2563eb",
                employees: deptEmps.slice(Math.ceil(deptEmps.length / 2)).map(e => e._id),
                isOvertime: false
            });

            days.push({
                date: dayDate,
                shifts: shifts
            });
        }

        // 30% Schedules Approved/Published
        const status = Math.random() > 0.5 ? 'published' : 'review';

        const week = getWeekNumber(currentWeekStart);
        const year = currentWeekStart.getFullYear();
        const deptName = (deptEmps[0] as any)?.storeDepartmentId?.name || "dept"; // simplified

        await Schedule.create({
            storeId: sd.storeId,
            storeDepartmentId: sd._id,
            slug: slugify(`${year}-w${week}-${sd.name}-${faker.string.alphanumeric(4)}`),
            weekNumber: week,
            year: year,
            dateRange: { startDate: currentWeekStart, endDate: new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000) },
            status: status,
            createdBy: admin._id,
            days: days
        });
    }

    // --- 10. Notices ---
    console.log("Generating Notices...");
    const noticeScopes: ('global' | 'store' | 'store_department')[] = ['global', 'store', 'store_department'];
    for (let i = 0; i < 15; i++) {
        const scope = faker.helpers.arrayElement(noticeScopes);
        const title = faker.company.catchPhrase();
        let targetId = null;

        if (scope === 'store') {
            targetId = faker.helpers.arrayElement(stores)._id;
        } else if (scope === 'store_department') {
            targetId = faker.helpers.arrayElement(fetchedStoreDepts)._id;
        }

        await Notice.create({
            title: title,
            slug: slugify(title) + "-" + faker.string.alphanumeric(6),
            content: faker.lorem.paragraphs(2),
            priority: faker.helpers.arrayElement(['normal', 'urgent']),
            targetScope: scope,
            targetId: targetId,
            createdBy: faker.helpers.arrayElement(allEmployees)._id,
            createdAt: faker.date.recent({ days: 30 })
        });
    }

    // --- 11. Personal Notes/Todos ---
    console.log("Generating Personal Notes...");
    for (const emp of allEmployees) {
        if (Math.random() > 0.5) {
            const numNotes = faker.number.int({ min: 1, max: 4 });
            for (let n = 0; n < numNotes; n++) {
                const title = faker.lorem.words(3);
                await Note.create({
                    userId: emp._id,
                    title: title,
                    slug: slugify(title) + "-" + faker.string.alphanumeric(6),
                    content: faker.lorem.sentence(),
                    isTask: Math.random() > 0.5,
                    completed: Math.random() > 0.7,
                    priority: faker.helpers.arrayElement(['low', 'medium', 'high'])
                });
            }
        }
    }

    console.log("Seeding Complete!");
    process.exit(0);
}

function getWeekNumber(d: Date) {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNo;
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
