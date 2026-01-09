
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import dotenv from 'dotenv';
import {
    Company,
    GlobalDepartment,
    Store,
    StoreDepartment,
    Role,
    Position,
    Employee,
    Schedule,
    VacationRecord,
    VacationRequest,
    AbsenceRecord,
    AbsenceRequest,
    ShiftDefinition,
    Task,
    Problem,
    Food,
    Category,
    Notice
} from '../src/lib/models';

dotenv.config();

if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined');
    process.exit(1);
}

const PASSWORD_HASH = bcrypt.hashSync('password123', 10);

// --- Data Constants ---
const STORES = [
    { name: 'LX Factory', slug: 'lx-factory', depts: ['Kitchen', 'Front Of House'] },
    { name: 'Telheiras', slug: 'telheiras', depts: ['Kitchen', 'Front Of House'] },
    { name: 'Linda-a-Velha', slug: 'linda-a-velha', depts: ['Kitchen', 'Front Of House'] },
    { name: 'Ubbo', slug: 'ubbo', depts: ['Kitchen', 'Front Of House'] },
    { name: 'Campolide', slug: 'campolide', depts: ['Kitchen', 'Front Of House'] },
    { name: 'Production', slug: 'production', depts: ['Kitchen'] }
];

const GLOBAL_DEPTS = ['Kitchen', 'Front Of House', 'Management'];

const POSITIONS = {
    // Dept Specific
    HEAD: { level: 8, name: 'Head of Department' },
    SUB: { level: 6, name: 'Sub-Manager' },
    STAFF: { level: 2, name: 'Staff' },
    // Store General
    STORE_MANAGER: { level: 10, name: 'Store Manager' }
};

// --- Employee Data Definition ---
// Structure: StoreName -> DeptName -> List of Users
const EMPLOYEES_DATA: any = {
    'LX Factory': {
        'Front Of House': [
            { first: 'Marcos', last: 'Oliveira', role: 'Head', type: 'Contracted' },
            { first: 'Saifung', last: 'Rai', role: 'Staff', type: 'Contracted' },
            { first: 'Nabina', last: 'Rai', role: 'Staff', type: 'Contracted' },
            { first: 'Leonardo', last: 'Veiga', role: 'Staff', type: 'Contracted' },
            { first: 'Kalina', last: 'Goncalves', role: 'Staff', type: 'Extra' }
        ],
        'Kitchen': [
            { first: 'Abhishek', last: 'Sharma', role: 'Head', type: 'Contracted' },
            { first: 'Sakib', last: 'Ahmed', role: 'Staff', type: 'Contracted' },
            { first: 'Alian', last: 'Sharma', role: 'Staff', type: 'Contracted' },
            { first: 'Tej', last: 'Pathak', role: 'Staff', type: 'Contracted' },
            { first: 'Sunny', last: 'Shahi', role: 'Staff', type: 'Trial' }
        ]
    },
    'Telheiras': {
        'Front Of House': [
            { first: 'Rosilene', last: 'Silva', role: 'Head', type: 'Contracted' },
            { first: 'Bianca', last: '', role: 'Staff', type: 'Contracted' } // No last name logic
        ],
        'Kitchen': [
            { first: 'Raju', last: '', role: 'Head', type: 'Contracted' },
            { first: 'Srijana', last: '', role: 'Staff', type: 'Contracted' },
            { first: 'Abishes', last: '', role: 'Staff', type: 'Contracted' },
            { first: 'Rabindra', last: '', role: 'Staff', type: 'Contracted' }
        ]
    },
    'Campolide': {
        'Front Of House': [
            { first: 'Ana', last: '', role: 'Head', type: 'Contracted' },
            { first: 'Tomas', last: '', role: 'Staff', type: 'Extra' },
            { first: 'Julio', last: '', role: 'Staff', type: 'Extra' }
        ],
        'Kitchen': [
            { first: 'Santosh', last: '', role: 'Head', type: 'Contracted' },
            { first: 'Nikesh', last: '', role: 'Staff', type: 'Contracted' },
            { first: 'Jagadish', last: '', role: 'Staff', type: 'Contracted' },
            { first: 'Robel', last: '', role: 'Staff', type: 'Contracted' },
            { first: 'Sandesh', last: '', role: 'Staff', type: 'Contracted' }
        ]
    },
    'Linda-a-Velha': {
        'Front Of House': [
            { first: 'Raphaella', last: '', role: 'Head', type: 'Contracted' },
            { first: 'Renata', last: '', role: 'Staff', type: 'Contracted' }
        ],
        'Kitchen': [
            { first: 'Bipin', last: '', role: 'Head', type: 'Contracted' },
            { first: 'Ram', last: '', role: 'Staff', type: 'Contracted' },
            { first: 'Prem', last: '', role: 'Staff', type: 'Contracted' },
            { first: 'Dipendra', last: '', role: 'Staff', type: 'Contracted' }
        ]
    },
    'Ubbo': {
        'Front Of House': [
            { first: 'Oliver', last: '', role: 'Head', type: 'Contracted' },
            { first: 'Shelcio', last: '', role: 'Sub', type: 'Contracted' },
            { first: 'Eduardo', last: '', role: 'Staff', type: 'Contracted' },
            { first: 'Bianca', last: '', role: 'Staff', type: 'Contracted' },
            { first: 'Francineta', last: '', role: 'Staff', type: 'Extra' }
        ],
        'Kitchen': [
            { first: 'Bijay', last: '', role: 'Head', type: 'Contracted' },
            { first: 'Manoj', last: '', role: 'Staff', type: 'Contracted' },
            { first: 'Deepak', last: '', role: 'Staff', type: 'Contracted' },
            { first: 'Bibek', last: '', role: 'Staff', type: 'Contracted' }
        ]
    },
    'Production': {
        'Kitchen': [
            { first: 'Asish', last: 'Poudel', role: 'Head', type: 'Contracted' },
            { first: 'Samiksha', last: '', role: 'Staff', type: 'Contracted' }
        ]
    }
};


async function clearDB() {
    console.log('🧹 Clearing Database...');
    const models = [
        Company, GlobalDepartment, Store, StoreDepartment, Role, Position,
        Employee, Schedule, VacationRecord, VacationRequest, AbsenceRecord,
        AbsenceRequest, ShiftDefinition, Task, Problem, Food, Category
    ];
    for (const model of models) {
        await model.deleteMany({});
    }
    console.log('✅ Database Cleared');
}

async function seed() {
    console.log('🌱 Starting Seed V3...');
    await mongoose.connect(process.env.MONGODB_URI!);
    await clearDB();

    // 1. Roles
    console.log('Creating Roles...');
    const roleMap = new Map();
    const roleNames = ['Owner', 'HR', 'Tech', 'Store Manager', 'Employee', 'Department Head'];
    // Simplified roles for logic mapping. 
    // Actual DB roles:
    for (const rName of roleNames) {
        const role = await Role.create({
            name: rName,
            description: `System role for ${rName}`,
            active: true
        });
        roleMap.set(rName, role._id);
    }

    // 2. Company & Global Depts
    console.log('Creating Organization...');
    const company = await Company.create({
        name: 'Chickinho',
        active: true,
        weekStartsOn: 'monday'
    });

    const globalDepts = [];
    const gdMap = new Map(); // Name -> Doc
    for (const dName of GLOBAL_DEPTS) {
        const gd = await GlobalDepartment.create({
            name: dName,
            slug: faker.helpers.slugify(dName).toLowerCase(),
            headOfDepartment: null, // Set later
            active: true
        });
        globalDepts.push(gd);
        gdMap.set(dName, gd);
    }

    // 3. Positions (Generic)
    const positionMap = new Map(); // "Store Manager" | "Head-Kitchen" | "Staff-Kitchen" -> ID

    // Store Manager Pos
    const smPos = await Position.create({
        name: 'Store Manager',
        slug: 'store-manager',
        level: 10,
        roles: [roleMap.get('Store Manager')],
        active: true
    });
    positionMap.set('Store Manager', smPos._id);

    // Dept Positions
    for (const gd of globalDepts) {
        // Head
        const h = await Position.create({
            name: `Head of ${gd.name}`,
            slug: `head-${gd.slug}`,
            level: 8,
            roles: [roleMap.get('Department Head'), roleMap.get('Employee')],
            isDepartmentSpecific: true,
            active: true
        });
        positionMap.set(`Head-${gd.name}`, h._id);

        // Sub
        const s = await Position.create({
            name: `Sub-Manager ${gd.name}`,
            slug: `sub-${gd.slug}`,
            level: 6,
            roles: [roleMap.get('Employee')],
            isDepartmentSpecific: true,
            active: true
        });
        positionMap.set(`Sub-${gd.name}`, s._id);

        // Staff
        const w = await Position.create({
            name: `${gd.name} Staff`,
            slug: `staff-${gd.slug}`,
            level: 2,
            roles: [roleMap.get('Employee')],
            isDepartmentSpecific: true,
            active: true
        });
        positionMap.set(`Staff-${gd.name}`, w._id);
    }

    // 4. Stores & Store Depts
    console.log('Creating Stores...');
    const storeMap = new Map(); // Name -> Doc
    const storeDeptMap = new Map(); // "StoreName-DeptName" -> Doc

    for (const sData of STORES) {
        const store = await Store.create({
            companyId: company._id,
            name: sData.name,
            slug: sData.slug,
            active: true
        });
        storeMap.set(sData.name, store);

        for (const dName of sData.depts) {
            const gd = gdMap.get(dName);
            const sd = await StoreDepartment.create({
                storeId: store._id,
                globalDepartmentId: gd._id,
                name: dName,
                slug: `${store.slug}-${gd.slug}`,
                active: true
            });
            storeDeptMap.set(`${sData.name}-${dName}`, sd);

            // Add Managers List (empty for now)
            // Note: Store managers are usually "Store Managers" but Head of Depts allow management too
        }
    }

    // 5. Employees
    const employees = [];

    // Helper: Generate Email
    function genEmail(first: string, last: string, storeName: string) {
        const cleanStore = storeName.toLowerCase().replace(/ /g, '').replace(/-/g, '');
        if (!last) return `${first.toLowerCase()}.${cleanStore}@chickinho.com`;
        return `${first.toLowerCase()}.${last.toLowerCase()}@chickinho.com`;
    }

    // Helper: Create User
    async function createUser(first: string, last: string, roleName: string, email?: string, extraData: any = {}) {
        const e = email || genEmail(first, last, 'global');
        const roleId = roleMap.get(roleName) || roleMap.get('Employee');
        const user = await Employee.create({
            firstName: first,
            lastName: last || '.',
            slug: faker.helpers.slugify(`${first} ${last || ''}`).toLowerCase() + '-' + faker.string.alpha(3),
            email: e,
            password: PASSWORD_HASH,
            roles: [roleName],
            active: true,
            joinedOn: new Date('2024-01-01'),
            ...extraData
        }) as any;
        return user;
    }

    // --- A. Top Level ---
    console.log('Creating Top Level Users...');
    await createUser('Tech', 'Admin', 'Tech', 'tech@chickinho.com');
    await createUser('Sergio', 'Lourerio', 'HR', 'sergio.lourerio@chickinho.com');
    await createUser('Rosilene', 'Silva', 'HR', 'rosilene.silva.hr@chickinho.com'); // Note: Rosilene is also FOH Head Telheiras? No, usually distinct login or multi-role. Assume distinct for now or she covers both. User said "2x hr (Sergio and Rosilene)". And also listed Rosilene as Telheiras Manager. Let's create separate HR account for clarity or same? Let's make separate for "HR Role" vs "Store Role" to avoid confusion, or combined.
    // Actually, "Rosilene silva (manager, Head of Front Of House)" in Telheiras. And "2x hr (... rosilene silva)".
    // It's the same person. Let's create her once with both roles?
    // Tech Stack often separates "Global HR" from "Store Worker".
    // I will create specific accounts as requested in the list first.
    // Let's create the Pure HR/Owners first.

    // Owners
    await createUser('Jose', 'Cotta Maria', 'Owner', 'jose.cotta.maria@chickinho.com');
    await createUser('Fransisco', 'Castello', 'Owner', 'fransisco.castello@chickinho.com');

    // --- B. Global Heads ---
    console.log('Creating Global Heads...');
    // Kitchen: Eduardo Sotelo
    const eduardo = await createUser('Eduardo', 'Sotelo', 'Department Head', 'eduardo.sotelo@chickinho.com', {
        storeDepartmentId: null
    });
    await GlobalDepartment.updateOne({ name: 'Kitchen' }, { headOfDepartment: eduardo._id });

    // FOH: Jose Cotta Maria (Already Owner, but let's link him?)
    // Management: Jose Cotta Maria, Fransisco Castello
    const jose = await Employee.findOne({ email: 'jose.cotta.maria@chickinho.com' });
    if (jose) {
        await GlobalDepartment.updateOne({ name: 'Front Of House' }, { headOfDepartment: jose._id });
        await GlobalDepartment.updateOne({ name: 'Management' }, { headOfDepartment: jose._id });
    }


    // --- C. Store Employees ---
    console.log('Creating Store Employees...');

    for (const [storeName, depts] of Object.entries(EMPLOYEES_DATA)) {
        const store = storeMap.get(storeName);
        if (!store) continue;

        for (const [deptName, users] of Object.entries(depts as any)) {
            const sd = storeDeptMap.get(`${storeName}-${deptName}`);
            const gdName = deptName;

            for (const u of (users as any)) {
                const email = genEmail(u.first, u.last, storeName);

                // Determine Position ID
                let posId;
                let roles = ['Employee'];
                if (u.role === 'Head') {
                    posId = positionMap.get(`Head-${gdName}`);
                    roles.push('Department Head'); // Local Head
                } else if (u.role === 'Sub') {
                    posId = positionMap.get(`Sub-${gdName}`);
                } else { // Staff
                    posId = positionMap.get(`Staff-${gdName}`);
                }

                // Special Case: Rosilene is HR + FOH Head?
                if (u.first === 'Rosilene' && u.last === 'Silva') {
                    roles.push('HR');
                }

                const emp = await Employee.create({
                    firstName: u.first,
                    lastName: u.last || '.',
                    email: email,
                    slug: faker.helpers.slugify(`${u.first} ${u.last || ''}-${store.slug}`).toLowerCase(),
                    password: PASSWORD_HASH,
                    roles: roles,
                    storeId: store._id,
                    storeDepartmentId: sd._id,
                    positionId: posId,
                    active: true,
                    contract: {
                        employmentType: u.type,
                        weeklyHours: u.type === 'Extra' ? 0 : 40
                    },
                    joinedOn: new Date('2024-01-01')
                });
                employees.push(emp);

                // Link Head
                if (u.role === 'Head') {
                    await StoreDepartment.findByIdAndUpdate(sd._id, { headOfDepartment: emp._id });
                }
                await StoreDepartment.findByIdAndUpdate(sd._id, { $push: { employees: emp._id } });
            }
        }
    }

    console.log(`✅ Created ~${employees.length} Store Employees`);

    // --- 6. Operational Data (Schedules & Vacations) ---
    console.log('📅 Generating Operational Data (History & Future)...');

    // Helper: Get Weeks
    function getWeeksBetween(start: Date, end: Date) {
        const weeks = [];
        let current = new Date(start);
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1); // Monday
        current.setDate(diff);
        current.setHours(0, 0, 0, 0);

        while (current <= end) {
            const weekStart = new Date(current);
            const weekEnd = new Date(current);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            // Week No
            const d = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

            weeks.push({
                start: weekStart,
                end: weekEnd,
                year: weekStart.getFullYear() !== weekEnd.getFullYear() && weekNo === 1 ? weekEnd.getFullYear() : weekStart.getFullYear(),
                weekNumber: weekNo
            });
            current.setDate(current.getDate() + 7);
        }
        return weeks;
    }

    const today = new Date();
    const startDate = new Date('2025-01-01');
    const endDate = new Date('2026-02-28');
    const allWeeks = getWeeksBetween(startDate, endDate);

    // A. Schedules
    console.log(`   - Generating Schedules for ${allWeeks.length} weeks across all stores...`);

    for (const [storeName, storeDoc] of storeMap.entries()) {
        // Get Depts for this store
        const sData = STORES.find(s => s.name === storeName);
        if (!sData) continue;

        for (const dName of sData.depts) {
            const sd = storeDeptMap.get(`${storeName}-${dName}`);
            if (!sd) continue;

            // Get Employees for this dept
            const deptEmployees = employees.filter(e => e.storeDepartmentId?.toString() === sd._id.toString());
            if (deptEmployees.length === 0) continue;

            for (const week of allWeeks) {
                const isPast = week.end < today;
                // Status: Past = Published. Future = Draft or Published depending on how close.
                // Let's make everything up to next week published.
                const nextWeek = new Date(today);
                nextWeek.setDate(nextWeek.getDate() + 7);

                let status = 'draft';
                if (week.start <= nextWeek) status = 'published';

                const scheduleDays = [];
                for (let d = 0; d < 7; d++) {
                    const dayDate = new Date(week.start);
                    dayDate.setDate(dayDate.getDate() + d);

                    // Shift Logic:
                    // Morning: 10-16 or 10-18
                    // Evening: 18-00 or 18-02
                    // Staff assignments: Randomly pick 2-3 people per shift if available

                    const workingEmps = faker.helpers.arrayElements(deptEmployees, { min: Math.min(2, deptEmployees.length), max: Math.min(4, deptEmployees.length) });
                    const mid = Math.ceil(workingEmps.length / 2);
                    const morningCrew = workingEmps.slice(0, mid);
                    const eveningCrew = workingEmps.slice(mid);

                    const shifts = [];

                    // Morning
                    if (morningCrew.length > 0) {
                        shifts.push({
                            shiftName: 'Morning',
                            startTime: '10:00',
                            endTime: '16:00',
                            breakMinutes: 60,
                            employees: morningCrew.map(e => e._id),
                            color: '#eab308'
                        });
                    }

                    // Evening
                    if (eveningCrew.length > 0) {
                        shifts.push({
                            shiftName: 'Evening',
                            startTime: '18:00',
                            endTime: '00:00',
                            breakMinutes: 30,
                            employees: eveningCrew.map(e => e._id),
                            color: '#3b82f6',
                            isOvertime: faker.datatype.boolean(0.1)
                        });
                    }

                    scheduleDays.push({
                        date: dayDate,
                        shifts: shifts,
                        isHoliday: false
                    });
                }

                await Schedule.create({
                    storeId: storeDoc._id,
                    storeDepartmentId: sd._id,
                    slug: `${sd.slug}-${week.year}-w${week.weekNumber}`,
                    weekNumber: week.weekNumber,
                    year: week.year,
                    dateRange: { startDate: week.start, endDate: week.end },
                    status: status,
                    days: scheduleDays,
                    createdBy: employees[0]._id // Tech
                });
            }
        }
    }

    // B. Vacations & Absences
    console.log('   - Generating Vacations & Absences...');

    for (const emp of employees) {
        // 1. History 2025 (Vacations)
        // Give 70% of employees some history
        if (faker.datatype.boolean(0.7)) {
            const usedDays = faker.number.int({ min: 5, max: 20 });
            const fragments = faker.number.int({ min: 1, max: 3 });

            // Create records
            for (let i = 0; i < fragments; i++) {
                const start = faker.date.between({ from: '2025-01-01', to: '2025-12-01' });
                const duration = Math.ceil(usedDays / fragments);
                const end = new Date(start);
                end.setDate(end.getDate() + duration);

                await VacationRecord.create({
                    employeeId: emp._id,
                    from: start,
                    to: end,
                    totalDays: duration,
                    year: 2025,
                    approvedBy: employees[1]._id // HR
                });
            }

            // Update Tracker for 2026 (Rollover)
            // If they didn't use all 22 days, some rolls over?
            // Let's say default is 22.
            const leftOver = Math.max(0, 22 - usedDays);
            // Cap rollover at 10 (example rule)
            const rollover = Math.min(10, leftOver);

            // Update Employee Tracker
            await Employee.findByIdAndUpdate(emp._id, {
                'vacationTracker.rolloverDays': rollover,
                'vacationTracker.year': 2026
            });
        }

        // 2. Absences 2025
        if (faker.datatype.boolean(0.3)) {
            const date = faker.date.between({ from: '2025-01-01', to: '2025-12-31' });
            await AbsenceRecord.create({
                employeeId: emp._id,
                date: date,
                reason: 'Sick',
                type: 'sick',
                justification: 'Justified',
                approvedBy: employees[1]._id
            });
        }

        // 3. Position History (Ensure One Exists)
        await Employee.findByIdAndUpdate(emp._id, {
            $push: {
                positionHistory: {
                    positionId: emp.positionId,
                    storeId: emp.storeId,
                    storeDepartmentId: emp.storeDepartmentId,
                    from: new Date('2024-01-01'),
                    reason: 'Initial Contract'
                }
            }
        });
    }

    // C. Current Vacation (1 per Dept)
    console.log('   - Setting Active Vacations...');
    // Iterate Stores -> Depts
    for (const [storeName, storeDoc] of storeMap.entries()) {
        const sData = STORES.find(s => s.name === storeName);
        if (!sData) continue;
        for (const dName of sData.depts) {
            const sd = storeDeptMap.get(`${storeName}-${dName}`);
            const deptEmpIds = await StoreDepartment.findById(sd._id).then((d: any) => d.employees);
            if (!deptEmpIds || deptEmpIds.length === 0) continue;

            // Pick one random luck/unlucky person
            const luckyId = faker.helpers.arrayElement(deptEmpIds) as any;

            // Create active vacation (Now - 2 days to Now + 5 days)
            const start = new Date(today);
            start.setDate(start.getDate() - 2);
            const end = new Date(today);
            end.setDate(end.getDate() + 5);

            await VacationRecord.create({
                employeeId: luckyId,
                from: start,
                to: end,
                totalDays: 7,
                year: 2026,
                approvedBy: employees[1]._id
            });

            // Also Pending Requests for someone else
            const otherIds = deptEmpIds.filter((id: any) => id.toString() !== luckyId.toString());
            if (otherIds.length > 0) {
                const requester = faker.helpers.arrayElement(otherIds);
                const pStart = new Date(today);
                pStart.setDate(pStart.getDate() + 20);
                const pEnd = new Date(pStart);
                pEnd.setDate(pEnd.getDate() + 3);

                await VacationRequest.create({
                    employeeId: requester,
                    requestedFrom: pStart,
                    requestedTo: pEnd,
                    totalDays: 3,
                    status: 'pending',
                    createdAt: new Date()
                });
            }
        }
    }

    console.log('✅ Seed V3 Complete with Operational Data!');
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});
