
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
    Problem,
    Notification
} from "../src/lib/models";
import { slugify } from "../src/lib/utils";

async function seed() {
    console.log("🐔 Starting CHICKINHO Rebrand Seed (Yearful History)...");

    // 1. Connection
    if (!process.env.MONGODB_URI) {
        throw new Error("MONGODB_URI missing in env");
    }
    try {
        await mongoose.connect(process.env.MONGODB_URI);
    } catch (e) {
        console.error("Connection Error", e);
        process.exit(1);
    }

    console.log("🧹 Clearing Database...");
    const collections = [
        Company, GlobalDepartment, Store, StoreDepartment, Employee,
        Position, Role, Schedule, ShiftDefinition, VacationRecord,
        AbsenceRecord, Task, VacationRequest, AbsenceRequest, Note, Notice,
        Food, Category, Problem, Notification
    ];
    for (const Model of collections) {
        // @ts-ignore
        if (Model && Model.deleteMany) await Model.deleteMany({});
    }

    // 2. Roles (Standard)
    console.log("🎭 Creating Roles...");
    const rolesData = [
        { name: "super_user", permissions: ["all"], description: "Super User" },
        { name: "owner", permissions: ["manage_store", "manage_finance"], description: "Owner" },
        { name: "admin", permissions: ["manage_system"], description: "Admin" },
        { name: "hr", permissions: ["manage_people"], description: "HR" },
        { name: "tech", permissions: ["manage_tech"], description: "Tech" },
        { name: "store_manager", permissions: ["manage_store_local"], description: "Store Manager" },
        { name: "department_head", permissions: ["manage_dept_global"], description: "Department Head (Global)" },
        { name: "store_department_head", permissions: ["manage_dept_local"], description: "Shift Leader / Dept Head" },
        { name: "employee", permissions: ["basic"], description: "Employee" }
    ];
    const roleMap: Record<string, any> = {};
    for (const r of rolesData) {
        const doc = await Role.create(r);
        roleMap[r.name] = doc._id;
    }

    // 3. Company & Departments
    console.log("🏢 Creating Company 'Chickinho'...");
    const company = await Company.create({
        name: "Chickinho",
        taxNumber: "999888777",
        address: "Lisbon, Portugal",
        logo: "/logo_chickinho.png",
        active: true,
        totalVacationsPerYear: 22
    });

    const DEPT_NAMES = ["Management", "Kitchen", "Front of the House", "Drivers"];
    const gDepts: any[] = [];
    for (const name of DEPT_NAMES) {
        const d = await GlobalDepartment.create({ name, slug: slugify(name), hasHead: true, active: true });
        gDepts.push(d);
    }
    await company.updateOne({ globalDepartments: gDepts.map(d => d._id) });

    // 4. Stores (5)
    console.log("🏪 Creating Stores...");
    const STORE_NAMES = ["Lx Factory", "Campolide", "Linda A Velha", "Telheiras", "Ubbo"];
    const stores: any[] = [];
    const storeDepts: any[] = [];

    for (const name of STORE_NAMES) {
        const store = await Store.create({
            companyId: company._id,
            name,
            slug: slugify(name),
            address: `${name}, Lisbon`,
            active: true
        });
        stores.push(store);

        for (const gd of gDepts) {
            if (gd.name === "Management") continue;

            const sd = await StoreDepartment.create({
                storeId: store._id,
                globalDepartmentId: gd._id,
                name: gd.name,
                slug: `${store.slug}-${gd.slug}`,
                active: true
            });
            storeDepts.push(sd);
        }
    }

    // 5. Positions
    console.log("👔 Creating Positions...");
    const P_OWNER = await Position.create({ name: "Owner", slug: "owner", roles: [roleMap.owner] });
    const P_HR = await Position.create({ name: "HR Director", slug: "hr-director", roles: [roleMap.hr] });
    const P_TECH = await Position.create({ name: "Tech Admin", slug: "tech-admin", roles: [roleMap.tech, roleMap.admin] });
    const P_STORE_MGR = await Position.create({ name: "Store Manager", slug: "store-manager", roles: [roleMap.store_manager] });
    const P_SUB_MGR = await Position.create({ name: "Sub-Manager", slug: "sub-manager", roles: [roleMap.store_manager] });
    const P_HEAD = await Position.create({ name: "Head of Dept", slug: "head-dept", roles: [roleMap.store_department_head] });
    const P_STAFF_KITCHEN = await Position.create({ name: "Cook", slug: "cook", roles: [roleMap.employee] });
    const P_STAFF_FRONT = await Position.create({ name: "Waiter", slug: "waiter", roles: [roleMap.employee] });
    const P_STAFF_DRIVER = await Position.create({ name: "Driver", slug: "driver", roles: [roleMap.employee] });

    // 6. Employees
    console.log("👥 Creating Employees...");
    const passwordHash = await bcrypt.hash("Chick2026!", 10);
    const allEmps: any[] = [];

    const createEmp = async (firstName: string, lastName: string, email: string, posId: any, roles: string[], storeId: any = null, deptId: any = null) => {
        const emp = await Employee.create({
            firstName,
            lastName,
            email: email.toLowerCase(),
            password: passwordHash,
            slug: slugify(`${firstName} ${lastName}`) + "-" + faker.string.alphanumeric(3),
            nif: faker.string.numeric(9),
            dob: faker.date.birthdate({ min: 18, max: 60, mode: 'age' }),
            roles: roles,
            positionId: posId,
            storeId,
            storeDepartmentId: deptId,
            active: true,
            joinedOn: new Date(2024, 0, 1),
            vacationTracker: { defaultDays: 22, remainingDays: 22, year: 2026 }
        });
        allEmps.push(emp);
        return emp;
    };

    // A. Owners
    await createEmp("Jose", "Cotta Maria", "jose.cotta@chickinho.com", P_OWNER._id, ["owner"]);
    await createEmp("Fransisco", "Castello", "fransisco.castello@chickinho.com", P_OWNER._id, ["owner"]);

    // B. HR
    await createEmp("Sergio", "Lourerio", "sergio.lourerio@chickinho.com", P_HR._id, ["hr"]);
    await createEmp("Rosilene", "Silva", "rosilene.silva@chickinho.com", P_HR._id, ["hr"]);

    // C. Tech
    await createEmp("Tech", "Admin", "tech@chickinho.com", P_TECH._id, ["tech", "admin", "super_user"]);

    // D. Specific Employees
    const specificNames = [
        "Abhishek Sharma", "Alian Sharma", "Sakib Ahmed", "Tej Pathak", "Sunny Shahi",
        "Marcos Oliveira", "Saifung Rai", "Nabina Rai", "Kalina Goncalves", "Leonardo Veiga"
    ];

    // Assign Managers to Stores
    for (const store of stores) {
        const mName = faker.person.firstName();
        const m = await createEmp(mName, faker.person.lastName(), `manager.${store.slug}@chickinho.com`, P_STORE_MGR._id, ["store_manager"], store._id);
        await store.updateOne({ $push: { managers: m._id } });

        const sName = faker.person.firstName();
        const sm = await createEmp(sName, faker.person.lastName(), `sub.${store.slug}@chickinho.com`, P_SUB_MGR._id, ["store_manager"], store._id);
        await store.updateOne({ $push: { subManagers: sm._id } });
    }

    let pool = [...specificNames];
    for (let i = 0; i < 100; i++) {
        pool.push(faker.person.fullName());
    }

    for (const name of pool) {
        const [first, ...rest] = name.split(" ");
        const last = rest.join(" ");

        const sd = faker.helpers.arrayElement(storeDepts.filter((d: any) => d.name !== "Management"));

        const isHead = Math.random() < 0.1;
        const pos = isHead ? P_HEAD._id : (sd.name === "Kitchen" ? P_STAFF_KITCHEN._id : sd.name === "Drivers" ? P_STAFF_DRIVER._id : P_STAFF_FRONT._id);
        const role = isHead ? ["store_department_head"] : ["employee"];

        const emp = await createEmp(first, last, `${first.toLowerCase()}.${last.toLowerCase().replace(/ /g, '')}.${faker.string.alphanumeric(2)}@chickinho.com`, pos, role, sd.storeId, sd._id);

        if (isHead) {
            await sd.updateOne({ $push: { headOfDepartment: emp._id } });
        } else {
            await sd.updateOne({ $push: { employees: emp._id } });
        }
    }

    // ==========================================
    // 7. ROBUST HISTORY GENERATION (2025 - 2026)
    // ==========================================
    console.log("📅 Generating Schedules, Vacations, Absences, Tasks, Notices (2025-2026)...");

    const startDate = new Date(2025, 0, 1); // Jan 1 2025
    const endDate = new Date(2026, 2, 31); // Mar 31 2026
    const today = new Date();

    // A. Schedules Loop
    let currentDate = new Date(startDate);
    // Align to first Monday of 2025 (or just use Jan 1 as start range, week calc handles it)
    // 2025 Jan 1 was Wednesday. First Monday is Dec 30 2024 or Jan 6 2025 depending on ISO.
    // Let's just iterate by 7 days from Jan 1.

    // Quick helpers
    const getWeekNumber = (d: Date) => {
        d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
        var yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
        var weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
        return weekNo;
    }

    while (currentDate <= endDate) {
        const year = currentDate.getFullYear();
        const weekNum = getWeekNumber(currentDate);
        const endOfWeek = new Date(currentDate);
        endOfWeek.setDate(currentDate.getDate() + 6);

        // Determine Status
        let status = 'draft';
        if (endOfWeek < today) status = 'published'; // Past
        else if (endOfWeek.getTime() - today.getTime() < 30 * 24 * 60 * 60 * 1000) status = 'published'; // Current/Near Future (user said "till march", implying planned/published)

        // Actually, user said "fill schedule... till march". Usually future ones are drafts, but if filled, maybe published or ready.
        // Let's make immediate future published, far future draft.
        if (year === 2026 && currentDate.getMonth() > 1 && status === 'published') {
            // Mar 2026 might be draft or pending
            status = 'draft';
        }

        // Just Publish everything up to March 2026 as per user request "fill schedule... till march" 
        // implies they want data to exist. Status 'published' makes it visible.
        status = 'published';

        // For each store dept, create schedule
        for (const sd of storeDepts) {
            const emps = await Employee.find({ storeDepartmentId: sd._id });
            if (emps.length === 0) continue;

            const days = [];
            // Generate shifts for Mon-Sun
            for (let i = 0; i < 7; i++) {
                const d = new Date(currentDate);
                d.setDate(d.getDate() + i);

                // Randomize shifts slightly
                // 80% chance of standard shift
                if (Math.random() > 0.1) {
                    days.push({
                        date: d,
                        shifts: [{
                            shiftName: "Standard",
                            startTime: "10:00",
                            endTime: "19:00",
                            employees: emps.map(e => e._id), // Simplified: everyone works
                            color: "#0ea5e9"
                        }]
                    });
                }
            }

            await Schedule.create({
                storeId: sd.storeId,
                storeDepartmentId: sd._id,
                slug: `${year}-w${weekNum}-${sd.slug}-${currentDate.getTime()}`, // unique slug
                weekNumber: weekNum,
                year: year,
                dateRange: { startDate: currentDate, endDate: endOfWeek },
                status: status,
                days: days,
                createdBy: allEmps[0]._id
            });
        }

        // Next week
        currentDate.setDate(currentDate.getDate() + 7);
    }

    // B. Notices (2 per month from Jan 2025 to Jan 2026)
    console.log("📢 Generating Notices...");
    const noticeStart = new Date(2025, 0, 1);
    const noticeEnd = new Date(2026, 1, 1); // Feb 2026 roughly
    let nDate = new Date(noticeStart);

    while (nDate <= noticeEnd) {
        // Create 2 notices for this month
        for (let i = 0; i < 2; i++) {
            const title = `${faker.company.catchPhrase()} (${nDate.toLocaleString('default', { month: 'short' })} ${nDate.getFullYear()})`;
            const isStore = Math.random() > 0.7;
            const store = isStore ? faker.helpers.arrayElement(stores) : null;

            await Notice.create({
                title: title,
                slug: slugify(title + "-" + faker.string.alphanumeric(5)),
                content: faker.lorem.paragraph(),
                targetScope: isStore ? 'store' : 'global',
                targetId: isStore ? store._id : null,
                createdBy: allEmps[0]._id, // Fixed: createdBy instead of authorId
                pinned: Math.random() > 0.9,
                bgGradient: faker.helpers.arrayElement(["from-blue-500 to-cyan-500", "from-orange-500 to-red-500", "from-green-500 to-emerald-500", "from-purple-500 to-pink-500"]),
                createdAt: new Date(nDate.getFullYear(), nDate.getMonth(), Math.floor(Math.random() * 28) + 1),
                readBy: []
            });
        }
        nDate.setMonth(nDate.getMonth() + 1);
    }

    // C. Tasks (Last year and this year months)
    console.log("✅ Generating Tasks...");
    for (let i = 0; i < 200; i++) {
        // Random date in 2025-2026 range
        const tDate = faker.date.between({ from: '2025-01-01', to: '2026-03-30' });
        const type = faker.helpers.arrayElement(['store', 'store_department', 'individual']);
        let assignedTo = [];

        if (type === 'store') assignedTo = [{ type: 'store', id: faker.helpers.arrayElement(stores)._id }];
        else if (type === 'store_department') assignedTo = [{ type: 'store_department', id: faker.helpers.arrayElement(storeDepts)._id }];
        else assignedTo = [{ type: 'individual', id: faker.helpers.arrayElement(allEmps)._id }];

        await Task.create({
            title: faker.hacker.verb() + " " + faker.hacker.noun(),
            slug: slugify(faker.lorem.words(3) + "-" + faker.string.alphanumeric(5)),
            description: faker.lorem.sentence(),
            status: tDate < today ? "completed" : "todo", // Past completed, future todo
            priority: faker.helpers.arrayElement(["low", "medium", "high"]),
            assignedTo,
            createdBy: allEmps[0]._id,
            deadline: tDate,
            createdAt: new Date(tDate.getTime() - 86400000 * 5) // Created 5 days before deadline
        });
    }

    // D. Vacations & Absences (Past & Present)
    console.log("🏖️ Generating Vacations & Absences...");

    // 1. Someone ON VACATION NOW (Jan 2026)
    const luckyEmp = allEmps[5]; // Just pick index 5
    await VacationRecord.create({
        employeeId: luckyEmp._id,
        from: new Date(2026, 0, 1), // Jan 1 2026
        to: new Date(2026, 0, 15), // Jan 15 2026 (Still on vacation)
        totalDays: 14,
        year: 2026,
        approvedBy: allEmps[0]._id,
        status: 'approved',
        type: 'paid'
    });
    console.log(`User ${luckyEmp.firstName} is on vacation now.`);

    // 2. Random logic for others
    for (const emp of allEmps) {
        if (emp._id === luckyEmp._id) continue;

        // Past Vacation (2025)
        if (Math.random() > 0.4) {
            await VacationRecord.create({
                employeeId: emp._id,
                from: new Date(2025, 5, 10),
                to: new Date(2025, 5, 20),
                totalDays: 10,
                year: 2025,
                approvedBy: allEmps[0]._id,
                status: 'approved'
            });
        }

        // Past Absence (2025)
        if (Math.random() > 0.7) {
            await AbsenceRecord.create({
                employeeId: emp._id,
                date: faker.date.between({ from: '2025-01-01', to: '2025-12-31' }),
                reason: "Sick",
                approvedBy: allEmps[0]._id,
                status: 'approved'
            });
        }

        // Future Request (2026)
        if (Math.random() > 0.8) {
            await VacationRequest.create({
                employeeId: emp._id,
                requestedFrom: faker.date.future({ years: 0.5 }),
                requestedTo: faker.date.future({ years: 0.5 }), // simplified
                totalDays: 5,
                status: 'pending'
            });
        }
    }

    console.log("✅ Chickinho Seed Complete!");
    process.exit(0);
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
