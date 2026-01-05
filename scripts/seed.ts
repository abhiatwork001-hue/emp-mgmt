
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
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
} from '../src/lib/models'; // Adjust import path as needed

// Load env vars
dotenv.config();

if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI is not defined');
    process.exit(1);
}

const PASSWORD_HASH = bcrypt.hashSync('123456', 10);
const GLOBAL_DEPTS = ['Kitchen', 'Service', 'Bar', 'Management', 'Cleaning'];
const BRANCHES = ['Lisbon', 'Porto', 'Faro', 'Coimbra', 'Braga', 'Setubal'];
const ROLES = ['Owner', 'HR', 'Tech', 'Store Manager', 'Employee'];

// Helper to clear DB
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
    console.log('🌱 Starting Seed Process...');
    await mongoose.connect(process.env.MONGODB_URI!);

    await clearDB();

    // 1. Roles
    console.log('Creating Roles...');
    const roleMap = new Map();
    for (const rName of ROLES) {
        const role = await Role.create({
            name: rName,
            description: `System role for ${rName}`,
            permissions: [], // Add specific permissions if needed
            isSystemRole: true,
            active: true
        });
        roleMap.set(rName, role._id);
    }

    // 2. Company & Global Depts
    console.log('Creating Company & Global Departments...');
    const globalDeptDocs = [];
    for (const dName of GLOBAL_DEPTS) {
        const gd = await GlobalDepartment.create({
            name: dName,
            slug: faker.helpers.slugify(dName).toLowerCase(),
            hasHead: true,
            active: true
        });
        globalDeptDocs.push(gd);
    }

    const company = await Company.create({
        name: 'Chick Legacy',
        taxNumber: faker.finance.accountNumber(),
        address: faker.location.streetAddress(true),
        active: true,
        weekStartsOn: 'monday'
    });

    // 3. Stores & Store Depts
    console.log('Creating Stores & Departments...');
    const stores = [];
    const allStoreDepts = [];

    for (const bName of BRANCHES) {
        const store = await Store.create({
            companyId: company._id,
            name: bName,
            slug: faker.helpers.slugify(bName).toLowerCase(),
            address: faker.location.city(),
            active: true,
            minEmployees: 10,
            maxEmployees: 25
        });
        stores.push(store);

        // Create Depts for this store
        for (const gd of globalDeptDocs) {
            const sd = await StoreDepartment.create({
                storeId: store._id,
                globalDepartmentId: gd._id,
                name: gd.name,
                slug: `${store.slug}-${gd.slug}`,
                active: true,
                minEmployees: 2,
                maxEmployees: 8
            });
            allStoreDepts.push(sd);
        }
    }

    // 4. Positions
    console.log('Creating Positions...');
    const positions = [];
    // Generic positions linked to departments? Or simplified?
    // Let's make positions per Global Dept + Store Manager

    // Store Manager Position
    const posStoreManager = await Position.create({
        name: 'Store Manager',
        slug: 'store-manager',
        level: 10,
        roles: [roleMap.get('Store Manager')],
        isStoreSpecific: false,
        active: true
    });

    const posMap = new Map(); // GlobalDeptID -> [HeadPos, SubHeadPos, WorkerPos]

    for (const gd of globalDeptDocs) {
        const head = await Position.create({
            name: `Head of ${gd.name}`,
            slug: `head-${gd.slug}`,
            level: 8,
            roles: [roleMap.get('Employee')],
            isDepartmentSpecific: true,
            active: true
        });
        const sub = await Position.create({
            name: `Sub-Head of ${gd.name}`,
            slug: `sub-${gd.slug}`,
            level: 6,
            roles: [roleMap.get('Employee')],
            isDepartmentSpecific: true,
            active: true
        });
        const worker = await Position.create({
            name: `${gd.name} Staff`,
            slug: `staff-${gd.slug}`,
            level: 2,
            roles: [roleMap.get('Employee')],
            isDepartmentSpecific: true,
            active: true
        });

        posMap.set(gd._id.toString(), { head, sub, worker });
        positions.push(head, sub, worker);
    }

    // 5. Users (Employees)
    console.log('Creating Employees...');
    const employees = [];

    // Tech
    await Employee.create({
        firstName: 'Tech',
        lastName: 'Admin',
        slug: 'tech-admin',
        email: 'tech@lagasy.com',
        password: PASSWORD_HASH,
        roles: ['Tech'],
        active: true,
        joinedOn: new Date('2023-01-01')
    });

    // Owners
    for (let i = 1; i <= 2; i++) {
        await Employee.create({
            firstName: 'Owner',
            lastName: `${i}`,
            slug: `owner-${i}`,
            email: `owner${i}@lagasy.com`,
            password: PASSWORD_HASH,
            roles: ['Owner'],
            active: true,
            joinedOn: new Date('2023-01-01')
        });
    }

    // HR
    for (let i = 1; i <= 2; i++) {
        await Employee.create({
            firstName: 'HR',
            lastName: `${i}`,
            slug: `hr-${i}`,
            email: `hr${i}@lagasy.com`,
            password: PASSWORD_HASH,
            roles: ['HR'],
            active: true,
            joinedOn: new Date('2023-01-01')
        });
    }

    // Store Personnel
    for (const store of stores) {
        // Store Manager
        // Store Manager
        // Fix: Explicitly name them to match store and ensure relation
        const sm = await Employee.create({
            firstName: `Manager`,
            lastName: store.name,
            slug: faker.helpers.slugify(`manager-${store.name}`).toLowerCase(),
            email: `manager.${store.slug}@lagasy.com`,
            password: PASSWORD_HASH,
            roles: ['Store Manager'],
            storeId: store._id,
            positionId: posStoreManager._id,
            active: true,
            joinedOn: faker.date.past({ years: 2 }),
            contract: { weeklyHours: 40, employmentType: 'Contracted' },
            positionHistory: [{
                positionId: posStoreManager._id,
                storeId: store._id,
                from: faker.date.past({ years: 2 }),
                reason: 'Initial Hire'
            }]
        });
        employees.push(sm);
        // Link to store
        await Store.findByIdAndUpdate(store._id, { $push: { managers: sm._id } });

        // Department Staff
        const storeDepts = allStoreDepts.filter(sd => sd.storeId.toString() === store._id.toString());

        for (const sd of storeDepts) {
            const posSet = posMap.get(sd.globalDepartmentId.toString());

            // Head
            const head = await Employee.create({
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                slug: faker.internet.username() + '-' + faker.string.alpha(3),
                email: faker.internet.email({ provider: 'lagasy.com' }),
                password: PASSWORD_HASH,
                roles: ['Employee'],
                storeId: store._id,
                storeDepartmentId: sd._id,
                positionId: posSet.head._id,
                positionHistory: [{
                    positionId: posSet.head._id,
                    storeDepartmentId: sd._id,
                    from: faker.date.past({ years: 2 }),
                    reason: 'Promoted'
                }],
                isActive: true,
                joinedOn: faker.date.past({ years: 2 }),
                contract: { weeklyHours: 40, employmentType: 'Contracted' }
            });
            employees.push(head);
            // Link to Dept
            await StoreDepartment.findByIdAndUpdate(sd._id, { $push: { headOfDepartment: head._id, employees: head._id } });

            // Sub-Head
            const sub = await Employee.create({
                firstName: faker.person.firstName(),
                lastName: faker.person.lastName(),
                slug: faker.internet.username() + '-' + faker.string.alpha(3),
                email: faker.internet.email({ provider: 'lagasy.com' }),
                password: PASSWORD_HASH,
                roles: ['Employee'],
                storeId: store._id,
                storeDepartmentId: sd._id,
                positionId: posSet.sub._id,
                active: true,
                joinedOn: faker.date.past({ years: 1 }),
                contract: { weeklyHours: 40, employmentType: 'Contracted' }
            });
            employees.push(sub);
            await StoreDepartment.findByIdAndUpdate(sd._id, { $push: { subHead: sub._id, employees: sub._id } });

            // Workers (Random 2-4)
            const count = faker.number.int({ min: 2, max: 4 });
            for (let k = 0; k < count; k++) {
                const w = await Employee.create({
                    firstName: faker.person.firstName(),
                    lastName: faker.person.lastName(),
                    slug: faker.internet.username() + '-' + faker.string.alpha(3),
                    email: faker.internet.email({ provider: 'lagasy.com' }),
                    password: PASSWORD_HASH,
                    roles: ['Employee'],
                    storeId: store._id,
                    storeDepartmentId: sd._id,
                    positionId: posSet.worker._id,
                    active: true,
                    joinedOn: faker.date.past({ years: 1 }),
                    contract: {
                        weeklyHours: faker.helpers.arrayElement([20, 30, 40]),
                        employmentType: faker.helpers.arrayElement(['Contracted', 'Contracted', 'Extra'])
                    },
                    dob: faker.date.birthdate({ min: 18, max: 50, mode: 'year' }),
                    nif: faker.finance.accountNumber(),
                    phone: faker.phone.number(),
                    address: faker.location.streetAddress()
                });
                employees.push(w);
                await StoreDepartment.findByIdAndUpdate(sd._id, { $push: { employees: w._id } });
            }
        }
    }

    console.log(`✅ Created ~${employees.length} Employees`);

    // 6. Operational Data (Schedules)
    console.log('📅 Generating Schedules (This may take a while)...');

    const today = new Date();
    const startSeedDate = new Date(today);
    startSeedDate.setMonth(today.getMonth() - 12); // Start 1 year ago

    const endSeedDate = new Date(today);
    endSeedDate.setMonth(today.getMonth() + 6); // End 6 months in future

    // Helper to get weeks
    function getWeeksBetween(start: Date, end: Date) {
        const weeks = [];
        let current = new Date(start);
        // Align to Monday
        const day = current.getDay();
        const diff = current.getDate() - day + (day === 0 ? -6 : 1);
        current.setDate(diff);
        current.setHours(0, 0, 0, 0);

        while (current <= end) {
            const weekStart = new Date(current);
            const weekEnd = new Date(current);
            weekEnd.setDate(weekEnd.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            // Get ISO Week Number
            const d = new Date(Date.UTC(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()));
            const dayNum = d.getUTCDay() || 7;
            d.setUTCDate(d.getUTCDate() + 4 - dayNum);
            const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
            const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

            weeks.push({
                start: weekStart,
                end: weekEnd,
                // If week is mostly in next year (Week 1), use next year
                year: weekStart.getFullYear() !== weekEnd.getFullYear() && weekNo === 1 ? weekEnd.getFullYear() : weekStart.getFullYear(),
                weekNumber: weekNo
            });
            current.setDate(current.getDate() + 7);
        }
        return weeks;
    }

    const weeksToSeed = getWeeksBetween(startSeedDate, endSeedDate);

    for (const store of stores) {
        console.log(`  Processing Schedules for Store: ${store.name}`);
        const storeDepts = allStoreDepts.filter(sd => sd.storeId.toString() === store._id.toString());

        for (const sd of storeDepts) {
            const deptEmployees = employees.filter(e => e.storeDepartmentId?.toString() === sd._id.toString());
            if (deptEmployees.length === 0) continue;

            for (const week of weeksToSeed) {
                const isPast = week.end < today;
                const isCurrent = week.start <= today && week.end >= today;
                const isFuture = week.start > today;

                let status = isPast || isCurrent ? 'published' : faker.helpers.arrayElement(['draft', 'review', 'published']);

                const scheduleDays = [];
                for (let d = 0; d < 7; d++) {
                    const dayDate = new Date(week.start);
                    dayDate.setDate(dayDate.getDate() + d);

                    // Morning
                    const mStaff = faker.helpers.arrayElements(deptEmployees, { min: 1, max: Math.min(3, deptEmployees.length) });
                    // Evening
                    const eStaff = faker.helpers.arrayElements(deptEmployees, { min: 1, max: Math.min(3, deptEmployees.length) });

                    const shifts = [
                        {
                            shiftName: 'Morning',
                            startTime: '10:00',
                            endTime: faker.helpers.arrayElement(['16:00', '18:00']),
                            breakMinutes: 60,
                            employees: mStaff.map(e => e._id),
                            color: '#eab308'
                        },
                        {
                            shiftName: 'Evening',
                            startTime: '18:00',
                            endTime: faker.helpers.arrayElement(['00:00', '02:00']),
                            breakMinutes: 30,
                            employees: eStaff.map(e => e._id),
                            color: '#3b82f6',
                            isOvertime: faker.datatype.boolean(0.05)
                        }
                    ];

                    scheduleDays.push({
                        date: dayDate,
                        shifts: shifts,
                        isHoliday: d === 6 && faker.datatype.boolean(0.1) // Random sunday holiday
                    });
                }

                await Schedule.create({
                    storeId: store._id,
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

    // 7. Vacations & Absences
    console.log('✈️  Generating Vacations & Absences...');
    const now = new Date();

    for (const emp of employees) {
        // CURRENT Vacation (Someone is on vacation NOW)
        if (faker.datatype.boolean(0.05)) { // 5% chance active now
            const start = new Date(now);
            start.setDate(start.getDate() - 2);
            const end = new Date(now);
            end.setDate(end.getDate() + 5);
            await VacationRecord.create({
                employeeId: emp._id,
                from: start,
                to: end,
                totalDays: 7,
                year: now.getFullYear(),
                approvedBy: employees[1]._id
            });
        }

        // PAST Vacation (History) - generate 1-2 per person
        const pastCount = faker.number.int({ min: 0, max: 2 });
        for (let i = 0; i < pastCount; i++) {
            const start = faker.date.past({ years: 1 });
            const end = new Date(start);
            end.setDate(end.getDate() + 5);
            await VacationRecord.create({
                employeeId: emp._id,
                from: start,
                to: end,
                totalDays: 5,
                year: start.getFullYear(),
                approvedBy: employees[1]._id
            });
            // Absence History
            if (faker.datatype.boolean(0.3)) {
                const absDate = faker.date.past({ years: 1 });
                await AbsenceRecord.create({
                    employeeId: emp._id,
                    date: absDate,
                    reason: 'Sick Leave',
                    type: 'sick',
                    justification: 'Justified',
                    approvedBy: employees[1]._id
                });
            }
        }

        // Future Request (Pending/Approved)
        if (faker.datatype.boolean(0.2)) {
            const start = faker.date.future();
            const end = new Date(start);
            end.setDate(end.getDate() + 14);
            await VacationRequest.create({
                employeeId: emp._id,
                requestedFrom: start,
                requestedTo: end,
                totalDays: 14,
                status: faker.helpers.arrayElement(['pending', 'approved', 'rejected']),
                created_by: emp._id
            });
        }
    }

    // 8. Tasks (Notices)
    console.log('📝 Generating Tasks & Notices...');
    // Historical Tasks
    for (let i = 0; i < 10; i++) {
        const createdAt = faker.date.past({ years: 1 });
        const creator = faker.helpers.arrayElement(employees.filter(e => e.roles?.includes('Owner') || e.roles?.includes('Store Manager')));
        if (!creator) continue;

        await Task.create({
            title: faker.company.catchPhrase(),
            slug: faker.helpers.slugify(`old-task-${i}`).toLowerCase(),
            description: faker.lorem.sentence(),
            createdBy: creator._id,
            assignedTo: [{ type: 'store', id: stores[0]._id }], // Assign to first store for visibility
            priority: faker.helpers.arrayElement(['low', 'medium']),
            status: faker.helpers.arrayElement(['completed', 'completed', 'in_progress']),
            createdAt: createdAt,
            updatedAt: createdAt
        });

        // Historical Notice
        await Notice.create({
            title: `Announcement: ${faker.lorem.words(3)}`,
            slug: faker.helpers.slugify(`notice-${i}`).toLowerCase(),
            content: faker.lorem.paragraph(),
            priority: 'normal',
            targetScope: 'global',
            visibleToAdmin: true,
            createdBy: creator._id,
            createdAt: createdAt,
            updatedAt: createdAt
        });
    }

    // Current Store-wide Task
    for (const store of stores) {
        await Task.create({
            title: `Monthly Inventory - ${store.name}`,
            slug: faker.helpers.slugify(`inventory-${store.name}-${Date.now()}`).toLowerCase(),
            description: 'Please complete full stock count by Friday.',
            createdBy: employees[1]._id,
            assignedTo: [{ type: 'store', id: store._id }],
            priority: 'high',
            status: 'todo',
            todos: [
                { text: 'Count Dry Storage', completed: false },
                { text: 'Count Freezer', completed: false }
            ]
        });
    }

    // 9. Recipes (Food)
    console.log('🍔 Generating Recipes...');
    const catNames = ['Starters', 'Mains', 'Desserts', 'Drinks'];
    const categories = [];
    for (const cn of catNames) {
        const cat = await Category.create({ name: cn });
        categories.push(cat);
    }

    const recipes = [
        { name: 'Spicy Chicken Wings', cat: 'Starters', price: 12.50 },
        { name: 'Grilled Salmon', cat: 'Mains', price: 24.00 },
        { name: 'Vega Burger', cat: 'Mains', price: 16.00 },
        { name: 'Choco lava cake', cat: 'Desserts', price: 8.50 },
        { name: 'Mojito', cat: 'Drinks', price: 9.00 }
    ];

    for (const r of recipes) {
        const cat = categories.find(c => c.name === r.cat);
        await Food.create({
            name: r.name,
            slug: faker.helpers.slugify(r.name).toLowerCase(),
            category: cat?._id,
            description: faker.food.description(),
            heroImg: faker.image.urlLoremFlickr({ category: 'food' }),
            expirationDays: 3,
            ingredients: [
                { name: 'Ingredient A', amount: 100, unit: 'g', costPerUnit: 0.5, costForIngredient: 50 },
                { name: 'Ingredient B', amount: 2, unit: 'pcs', costPerUnit: 1.0, costForIngredient: 2 }
            ],
            costTotal: 52, // simple calc
            pvp: r.price,
            pvpSemIva: r.price * 0.8,
            active: true,
            isPublished: true,
            isActive: true,
            createdBy: employees[0]._id // Tech
        });
    }

    console.log('✅ Full Seed Complete');
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed Error:', err);
    process.exit(1);
});
