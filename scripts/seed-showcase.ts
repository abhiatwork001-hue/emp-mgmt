
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
    AbsenceRequest,
    Task,
    Notification,
    Note,
    VacationRecord,
    AbsenceRecord,
    ShiftDefinition,
    Notice
} from "../src/lib/models";

dotenv.config({ path: ".env" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error("MONGODB_URI is likely not defined in .env.local");
    process.exit(1);
}

// Data Sources
const STORE_LOCATIONS = [
    { name: "Lisbon Downtown", address: "Rua Augusta 100, Lisbon" },
    { name: "Porto Riverside", address: "Cais da Ribeira 20, Porto" },
    { name: "Algarve Beach", address: "Av. dos Descobrimentos 5, Albufeira" },
    { name: "Coimbra Central", address: "Largo da Portagem 1, Coimbra" },
    { name: "Braga Historic", address: "Praça da República 10, Braga" },
    { name: "Cascais Marina", address: "Marina de Cascais, Cascais" },
    { name: "Sintra Palace", address: "Rua das Padarias 2, Sintra" },
    { name: "Evora Ancient", address: "Praça do Giraldo 5, Evora" },
    { name: "Faro Airport", address: "Aeroporto de Faro, Faro" },
    { name: "Madeira Island", address: "Av. do Mar 10, Funchal" }
];

const GLOBAL_DEPTS = [
    "Kitchen", "Front of House", "Bar", "Management",
    "HR", "Logistics", "Maintenance", "Security",
    "Cleaning", "Marketing", "Finance", "IT",
    "Delivery", "Events"
];

const POSITIONS_BY_DEPT: any = {
    "Kitchen": ["Head Chef", "Sous Chef", "Chef de Partie", "Commis Chef", "Dishwasher"],
    "Front of House": ["Maître d'", "Head Waiter", "Waiter", "Runner", "Host"],
    "Bar": ["Head Bartender", "Mixologist", "Bartender", "Barback"],
    "Management": ["Store Manager", "Assistant Manager", "Supervisor"],
    "HR": ["HR Manager", "Recruiter", "HR Assistant"],
    "Logistics": ["Logistics Manager", "Driver", "Stock Clerk"],
    "Maintenance": ["Maintenance Head", "Technician", "Handyman"],
    "Security": ["Head of Security", "Security Guard", "Doorman"],
    "Cleaning": ["Cleaning Supervisor", "Cleaner", "Sanitation Specialist"],
    "Marketing": ["Marketing Manager", "Social Media Coordinator", "Designer"],
    "Finance": ["Finance Manager", "Accountant", "Cashier"],
    "IT": ["IT Manager", "System Admin", "Helpdesk"],
    "Delivery": ["Delivery Coordinator", "Driver", "Rider"],
    "Events": ["Events Manager", "Coordinator", "Host"]
};

const FIRST_NAMES = ["Maria", "Joao", "Ana", "Pedro", "Sofia", "Tiago", "Ines", "Diogo", "Beatriz", "Ricardo", "Mariana", "Bruno", "Carolina", "Andre", "Rita", "Miguel", "Catarina", "Francisco", "Lara", "Luis"];
const LAST_NAMES = ["Silva", "Santos", "Ferreira", "Pereira", "Oliveira", "Costa", "Rodrigues", "Martins", "Jesus", "Sousa", "Fernandes", "Goncalves", "Gomes", "Lopes", "Marques", "Alves", "Almeida", "Ribeiro", "Pinto", "Carvalho"];

function getRandomName() {
    const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    return { first, last };
}

async function seed() {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI!);
    console.log("Connected.");

    // 1. Wipe Data
    console.log("Wiping database...");
    await Promise.all([
        Employee.deleteMany({}),
        Company.deleteMany({}),
        Store.deleteMany({}),
        GlobalDepartment.deleteMany({}),
        StoreDepartment.deleteMany({}),
        Role.deleteMany({}),
        Position.deleteMany({}),
        Schedule.deleteMany({}),
        VacationRequest.deleteMany({}),
        AbsenceRequest.deleteMany({}),
        Task.deleteMany({}),
        Notification.deleteMany({}),
        Note.deleteMany({}),
        ShiftDefinition.deleteMany({}),
        VacationRecord.deleteMany({}),
        AbsenceRecord.deleteMany({}),
        Notice.deleteMany({})
    ]);
    console.log("Database wiped.");

    // 2. Global Departments
    console.log("Creating Global Departments...");
    const globalDeptDocs = await Promise.all(GLOBAL_DEPTS.map(async (name) => {
        return await GlobalDepartment.create({
            name,
            slug: name.toLowerCase().replace(/\s+/g, '-'),
            hasHead: true
        });
    }));
    const globalDeptMap = globalDeptDocs.reduce((acc, gd) => ({ ...acc, [gd.name]: gd }), {} as any);

    // 3. Roles
    console.log("Creating Roles...");
    const ROLE_NAMES = ["Store Manager", "Employee", "Department Head", "Store Department Head", "Owner", "Admin", "HR", "Super User"];
    const roles: any = {};
    for (const name of ROLE_NAMES) {
        roles[name] = await Role.create({ name, permissions: [], active: true });
    }

    // 4. Positions
    console.log("Creating Positions...");
    const positionDocs: any[] = [];
    const positionMap: any = {};

    for (const deptName of GLOBAL_DEPTS) {
        const posNames = POSITIONS_BY_DEPT[deptName] || [];
        for (const pName of posNames) {
            const pos = await Position.create({
                name: pName,
                roles: [roles["Employee"]._id], // Default base role
                active: true
            });
            positionDocs.push(pos);
            positionMap[pName] = pos;
        }
    }

    // 5. Company
    const company = await Company.create({
        name: "Chick Main Showcase",
        taxNumber: "500100200",
        address: "HQ Lisbon",
        active: true,
        globalDepartments: globalDeptDocs.map(d => d._id)
    });

    // 6. Stores & Store Departments
    console.log("Creating Stores...");
    const stores = [];

    // Helper to pick 6 random departments (always include Management, Kitchen, FOH + 3 others)
    const getStoreDepts = () => {
        const required = ["Management", "Kitchen", "Front of House"];
        const others = GLOBAL_DEPTS.filter(d => !required.includes(d));
        // Shuffle others
        const shuffled = others.sort(() => 0.5 - Math.random());
        return [...required, ...shuffled.slice(0, 3)];
    };

    for (const loc of STORE_LOCATIONS) {
        const store = await Store.create({
            companyId: company._id,
            name: loc.name,
            slug: loc.name.toLowerCase().replace(/\s+/g, '-'),
            address: loc.address,
            contactEmail: `${loc.name.replace(/\s+/g, '').toLowerCase()}@chickmain.com`
        });

        // Create Store Depts
        const deptNames = getStoreDepts();
        const storeDepts = [];
        for (const dName of deptNames) {
            const gd = globalDeptMap[dName];
            const sd = await StoreDepartment.create({
                storeId: store._id,
                globalDepartmentId: gd._id,
                name: dName,
                slug: `${store.slug}-${gd.slug}`,
                targetEmployees: 5
            });
            storeDepts.push(sd);
        }
        stores.push({ store, storeDepts });
    }

    // 7. Employees
    console.log("Creating Employees...");
    const hashedPassword = await bcrypt.hash("123456", 10);
    const allDetailEmployees: any[] = [];

    const createUser = async (data: any) => {
        // Ensure email uniqueness fallback
        let email = data.email;
        let counter = 1;
        while (await Employee.findOne({ email })) {
            email = email.replace('@', `${counter}@`);
            counter++;
        }

        const res = await Employee.create({
            password: hashedPassword,
            hourlyRate: 12 + Math.random() * 10,
            contractType: "Full-Time",
            isPasswordChanged: true,
            nif: Math.floor(100000000 + Math.random() * 900000000).toString(),
            joinedOn: new Date(new Date().setFullYear(new Date().getFullYear() - Math.floor(Math.random() * 3))),
            dob: new Date(1980 + Math.floor(Math.random() * 20), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28)),
            ...data,
            email // use unique
        });

        const emp = Array.isArray(res) ? res[0] : res;
        allDetailEmployees.push(emp);
        return emp as any;
    };

    // A. Tech (1)
    await createUser({
        firstName: "Tech", lastName: "Admin", email: "tech@chickmain.com",
        roles: ["Admin", "Super User"],
        address: "Server Room 1"
    });

    // B. Owners (2)
    await createUser({ firstName: "Owner", lastName: "One", email: "owner1@chickmain.com", roles: ["Owner"] });
    await createUser({ firstName: "Owner", lastName: "Two", email: "owner2@chickmain.com", roles: ["Owner"] });

    // C. HR (2)
    await createUser({ firstName: "HR", lastName: "Director", email: "hr.director@chickmain.com", roles: ["HR"] });
    await createUser({ firstName: "HR", lastName: "Assistant", email: "hr.assist@chickmain.com", roles: ["HR"] });

    // D. Global Dept Heads & SubHeads (14 * 2 = 28)
    for (const gd of globalDeptDocs) {
        // Head
        const head = await createUser({
            firstName: "Head", lastName: gd.name,
            email: `head.${gd.slug}@chickmain.com`,
            roles: ["Department Head"],
            positionId: positionMap[POSITIONS_BY_DEPT[gd.name]?.[0]]?._id
        });
        // SubHead
        const sub = await createUser({
            firstName: "Sub", lastName: gd.name,
            email: `sub.${gd.slug}@chickmain.com`,
            roles: ["Department Head"], // using same role for permission simplicity, or make new one
            positionId: positionMap[POSITIONS_BY_DEPT[gd.name]?.[1] || POSITIONS_BY_DEPT[gd.name]?.[0]]?._id
        });

        await GlobalDepartment.findByIdAndUpdate(gd._id, {
            departmentHead: [head._id],
            subHead: [sub._id]
        });
    }

    // E. Store Hierarchies
    for (const { store, storeDepts } of stores) {
        // 1. Store Manager & Sub (2)
        const manPos = positionMap["Store Manager"];
        const sm = await createUser({
            firstName: "Manager", lastName: store.name.split(' ')[0],
            email: `manager.${store.slug}@chickmain.com`,
            storeId: store._id,
            roles: ["Store Manager"],
            positionId: manPos?._id
        });
        const subSm = await createUser({
            firstName: "SubManager", lastName: store.name.split(' ')[0],
            email: `sub.${store.slug}@chickmain.com`,
            storeId: store._id,
            roles: ["Store Manager"],
            positionId: positionMap["Assistant Manager"]?._id
        });

        await Store.findByIdAndUpdate(store._id, {
            managers: [sm._id],
            subManagers: [subSm._id]
        });

        // 2. Store Dept Heads & SubHeads (6 depts * 2 = 12)
        for (const sd of storeDepts) {
            const hRole = roles["Store Department Head"];
            // Find appropriate position
            const posList = POSITIONS_BY_DEPT[sd.name] || [];

            const head = await createUser({
                firstName: "Head", lastName: `${store.name.split(' ')[0]}-${sd.name}`,
                email: `head.${sd.slug}@chickmain.com`,
                storeId: store._id,
                storeDepartmentId: sd._id,
                roles: ["Store Department Head"],
                positionId: positionMap[posList[0] || "Employee"]?._id
            });
            const sub = await createUser({
                firstName: "Sub", lastName: `${store.name.split(' ')[0]}-${sd.name}`,
                email: `sub.${sd.slug}@chickmain.com`,
                storeId: store._id,
                storeDepartmentId: sd._id,
                roles: ["Store Department Head"],
                positionId: positionMap[posList[1] || posList[0] || "Employee"]?._id
            });

            await StoreDepartment.findByIdAndUpdate(sd._id, {
                headOfDepartment: [head._id],
                subHead: [sub._id]
            });

            // 3. Regular Employees (~3 per dept? User wants ~200 total)
            // Currently ~160 created (Stores: 10 * (2 + 6*2) = 140) + 33 global = 173.
            // Need ~30 more. Let's add 1 extra employee to 3 random depts per store.

            if (["Kitchen", "Front of House", "Bar"].includes(sd.name)) {
                const { first, last } = getRandomName();
                const emp = await createUser({
                    firstName: first, lastName: last,
                    email: `${first}.${last}.${Math.floor(Math.random() * 1000)}@chickmain.com`,
                    storeId: store._id,
                    storeDepartmentId: sd._id,
                    roles: ["Employee"],
                    positionId: positionMap[posList[posList.length - 1] || "Employee"]?._id
                });

                // Position history for this employee
                await Employee.findByIdAndUpdate(emp._id, {
                    $push: {
                        positionHistory: {
                            positionId: emp.positionId,
                            storeId: emp.storeId,
                            storeDepartmentId: emp.storeDepartmentId,
                            reason: "Initial Hire",
                            from: new Date(2024, 0, 1),
                            assignedBy: sm._id
                        }
                    }
                });
            }
        }
    }

    // 8. Schedules (Past 2 months = ~8-9 weeks)
    console.log("Generating Schedules & Shifts...");
    const weeks = [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1]; // next week is 1
    const today = new Date();

    for (const { store, storeDepts } of stores) {
        for (const dept of storeDepts) {
            // Get employees in this dept
            const deptEmployees = allDetailEmployees.filter(e => e.storeDepartmentId?.toString() === dept._id.toString());
            // also include dept head/sub if they are linked to this dept
            // (Note: in step 7 we assigned storeDepartmentId to heads/subs too)

            if (deptEmployees.length === 0) continue;

            for (const weekOffset of weeks) {
                // Determine Week Start (Monday)
                const d = new Date(today);
                const currentDay = d.getDay(); // 0=Sun, 1=Mon
                const distanceToMonday = (currentDay + 6) % 7;
                d.setDate(d.getDate() - distanceToMonday + (weekOffset * 7));
                d.setHours(0, 0, 0, 0);

                const weekStart = new Date(d);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);

                const days = [];
                for (let i = 0; i < 7; i++) {
                    const date = new Date(weekStart);
                    date.setDate(weekStart.getDate() + i);

                    const dayShifts = [];
                    // Random shifts for employees
                    const shuffledEmps = deptEmployees.sort(() => 0.5 - Math.random());

                    // Morning Shift
                    if (shuffledEmps.length > 0) {
                        dayShifts.push({
                            shiftName: "Morning",
                            startTime: "09:00",
                            endTime: "17:00",
                            breakMinutes: 60,
                            color: "#F59E0B",
                            employees: shuffledEmps.slice(0, Math.ceil(shuffledEmps.length / 2)).map(e => e._id),
                            requiredHeadcount: 2
                        });
                    }
                    // Evening Shift
                    if (shuffledEmps.length > 1) {
                        dayShifts.push({
                            shiftName: "Evening",
                            startTime: "17:00",
                            endTime: "01:00",
                            breakMinutes: 60,
                            color: "#3B82F6",
                            employees: shuffledEmps.slice(Math.ceil(shuffledEmps.length / 2)).map(e => e._id),
                            requiredHeadcount: 2
                        });
                    }

                    days.push({
                        date,
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
                    createdBy: deptEmployees[0]._id, // Head
                    days
                });
            }
        }
    }

    // 9. Tasks & Notifications
    console.log("Generating Tasks & Notices...");
    // Overdue Task
    const someone = allDetailEmployees[10]; // Random
    await Task.create({
        title: "Submit Monthly Report (Overdue)",
        description: "Please submit the financial report.",
        createdBy: someone._id,
        assignedTo: [{ type: 'store', id: stores[0].store._id }],
        deadline: new Date(new Date().setDate(new Date().getDate() - 5)),
        status: 'todo',
        priority: 'high'
    });

    // Pending Task
    await Task.create({
        title: "Inventory Check",
        description: "Verify stock levels for kitchen.",
        createdBy: someone._id,
        assignedTo: [{ type: 'store_department', id: stores[0].storeDepts[0]._id }],
        deadline: new Date(new Date().setDate(new Date().getDate() + 2)),
        status: 'in_progress',
        priority: 'medium'
    });

    // Completed Task
    await Task.create({
        title: "Onboard New Staff",
        description: "Setup accounts.",
        createdBy: someone._id,
        assignedTo: [{ type: 'individual', id: allDetailEmployees[20]._id }],
        deadline: new Date(),
        status: 'completed',
        completedBy: [{ userId: allDetailEmployees[20]._id, completedAt: new Date() }]
    });

    // Notice
    await Notice.create({
        title: "Welcome to Chick Main",
        content: "We are happy to announce our new system launch!",
        targetScope: 'global',
        createdBy: someone._id,
        priority: 'normal'
    });

    // Vacation Request (Past & Future)
    await VacationRequest.create({
        employeeId: someone._id,
        requestedFrom: new Date(),
        requestedTo: new Date(new Date().setDate(new Date().getDate() + 3)),
        totalDays: 3,
        status: 'pending'
    });

    console.log("Seeding Complete!");
    process.exit(0);
}

// ISO 8601 week number
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
