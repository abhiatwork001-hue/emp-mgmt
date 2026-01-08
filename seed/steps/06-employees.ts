import bcrypt from 'bcryptjs';
import { Employee, Company, Store, StoreDepartment, Position, Role } from '../../src/lib/models';
import { NAMED_EMPLOYEES, RANDOM_EMPLOYEE_COUNT } from '../constants';
import { slugify } from '../utils/slug';
import { generatePortugueseNIF } from '../utils/nif';
import { generateRandomName, generateRandomEmail, generateRandomPhone, generateRandomAddress, randomDateInRange, pick, randomInt } from '../utils/random';
import { faker } from '@faker-js/faker';

export interface SeedData {
  company?: any;
  roles?: any[];
  positions?: any[];
  globalDepartments?: any[];
  stores?: any[];
  storeDepartments?: any[];
  employees?: any[];
}

export async function seedEmployees(data: SeedData): Promise<SeedData> {
  console.log('👤 Step 6: Creating Employees...');

  const employees: any[] = [];
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Create named employees (owners, HR, and specific employees)
  for (const empData of NAMED_EMPLOYEES) {
    const employee = await Employee.create({
      firstName: empData.firstName,
      lastName: empData.lastName,
      slug: slugify(`${empData.firstName} ${empData.lastName}`),
      email: empData.email,
      password: hashedPassword,
      nif: generatePortugueseNIF(),
      dob: faker.date.birthdate({ mode: 'age', min: 19, max: 59 }),
      phone: generateRandomPhone(),
      address: generateRandomAddress(),
      joinedOn: randomDateInRange(
        new Date(2020, 0, 1),
        new Date(2023, 11, 31)
      ),
      roles: empData.roles,
      active: true,
      isPasswordChanged: false,
      contract: {
        weeklyHours: 40,
        workingDays: [1, 2, 3, 4, 5],
        employmentType: "Contracted",
        vacationAllowed: true
      },
      vacationTracker: {
        defaultDays: 22,
        rolloverDays: 0,
        usedDays: 0,
        pendingRequests: 0,
        year: 2025
      }
    });
    employees.push(employee);
  }

  // Create random employees
  for (let i = 0; i < RANDOM_EMPLOYEE_COUNT; i++) {
    const { firstName, lastName } = generateRandomName();
    const email = generateRandomEmail(firstName, lastName);

    const employee = await Employee.create({
      firstName,
      lastName,
      slug: slugify(`${firstName} ${lastName}-${i}`),
      email: `${email.split('@')[0]}-${i}@chickinho.com`,
      password: hashedPassword,
      nif: generatePortugueseNIF(),
      dob: faker.date.birthdate({ mode: 'age', min: 19, max: 34 }),
      phone: generateRandomPhone(),
      address: generateRandomAddress(),
      joinedOn: randomDateInRange(
        new Date(2022, 0, 1),
        new Date(2024, 11, 31)
      ),
      roles: ['employee'],
      active: true,
      isPasswordChanged: false,
      contract: {
        weeklyHours: randomInt(30, 40),
        workingDays: [1, 2, 3, 4, 5],
        employmentType: pick(["Contracted", "Freelancer", "Extra"]),
        vacationAllowed: true
      },
      vacationTracker: {
        defaultDays: 22,
        rolloverDays: 0,
        usedDays: 0,
        pendingRequests: 0,
        year: 2025
      }
    });
    employees.push(employee);
  }

  // Assign employees to stores and departments
  await assignEmployeesToStoresAndDepartments(employees, data);

  // Update company with employees
  if (data.company) {
    await Company.findByIdAndUpdate(data.company._id, {
      employees: employees.map(e => e._id),
      owners: employees
        .filter(e => e.roles?.includes('owner'))
        .map(e => ({ name: `${e.firstName} ${e.lastName}`, id: e._id }))
    });
  }

  console.log(`✅ Created ${employees.length} employees`);

  return {
    ...data,
    employees
  };
}

async function assignEmployeesToStoresAndDepartments(
  employees: any[],
  data: SeedData
) {
  const owners = employees.filter(e => e.roles?.includes('owner'));
  const hrEmployees = employees.filter(e => e.roles?.includes('hr'));
  const regularEmployees = employees.filter(
    e => !e.roles?.includes('owner') && !e.roles?.includes('hr')
  );

  const stores = data.stores || [];
  const storeDepartments = data.storeDepartments || [];
  const positions = data.positions || [];

  // Assign owners (no store assignment, they're company-level)
  // Owners stay unassigned or can be assigned to a main store

  // Assign HR employees (can be at any store)
  for (const hr of hrEmployees) {
    if (stores.length > 0) {
      const store = pick(stores);
      await Employee.findByIdAndUpdate(hr._id, {
        storeId: store._id
      });
      await Store.findByIdAndUpdate(store._id, {
        $addToSet: { employees: hr._id }
      });
    }
  }
  // Assign Eduardo Sotelo as Global Kitchen Head
  const eduardo = employees.find(e => e.email === 'eduardo.sotelo@chickinho.com');
  if (eduardo) {
    console.log('👨‍🍳 Assigning Eduardo Sotelo as Global Kitchen Head...');
    const kitchenGlobal = data.globalDepartments?.find(d => d.name === 'Kitchen');
    if (kitchenGlobal) {
      // Assign to a random store or Headquarters if we had it, for now pick Lx Factory but without specific dept role overrides if undesired, or just keep him unassigned to store but assigned to Global Dept.
      // User said "make him kitchen global head".
      // Update Global Department
      // Also he needs to be "Manager" role likely.
      await Employee.findByIdAndUpdate(eduardo._id, {
        roles: ['manager', 'head_chef'], // Custom roles or just manager
        // storeId: lxFactoryStore?._id, // Optional: if he needs to access a store
      });
      // Update Global Dept
      // Mongoose model instance update
      // We use direct DB update since 'kitchenGlobal' might be a plain object or document
      const GlobalDepartmentModel = require('../../src/lib/models').GlobalDepartment;
      await GlobalDepartmentModel.findByIdAndUpdate(kitchenGlobal._id, {
        $push: { departmentHead: eduardo._id }
      });
    }
  }

  // 3. Assign NAMED Employees with strict rules
  console.log("Assigning Named Employees...");
  const namedEmployees = await Employee.find({ email: { $in: NAMED_EMPLOYEES.map(e => e.email) } });

  // 1. Identify Key Personnel & Departments
  const lxFactoryStore = stores.find(s => s.name === 'Lx Factory');

  if (!lxFactoryStore) {
    console.error("⚠️ Lx Factory store not found! Skipping Lx-specific assignments.");
  }

  // Need to get departments for Lx Factory specifically
  const lxKitchenDept = storeDepartments.find(sd => sd.storeId.toString() === lxFactoryStore?._id?.toString() && sd.name.includes('Kitchen'));
  const lxFohDept = storeDepartments.find(sd => sd.storeId.toString() === lxFactoryStore?._id?.toString() && sd.name.includes('Front'));

  const abhishek = namedEmployees.find(e => e.email === 'abhishek.sharma@chickinho.com');
  // Need to fetch Marcos from namedEmployees as well since he is in NAMED_EMPLOYEES constant
  const marcos = namedEmployees.find(e => e.email === 'marcos.oliveira@chickinho.com');

  const kitchenStaffNames = ['Sakib', 'Alian', 'Tej', 'Sunny']; // Abhishek handled separately
  const asish = namedEmployees.find(e => e.email === 'asish.poudel@chickinho.com');

  // Build Lists
  const kitchenStaff: any[] = [];

  // Specific Kitchen Staff
  if (abhishek) kitchenStaff.push(abhishek);
  if (asish) kitchenStaff.push(asish);

  for (const name of kitchenStaffNames) {
    const emp = namedEmployees.find(e => e.firstName === name || e.email.includes(name.toLowerCase()));
    if (emp && !kitchenStaff.some(e => e._id.toString() === emp._id.toString())) {
      kitchenStaff.push(emp);
    }
  }

  // FOH Staff: "Rest of the constant/named employees"
  // Filter named employees who are NOT in kitchen list, NOT owner/hr/tech/eduardo
  const fohStaff = namedEmployees.filter(e => {
    if (e.roles.includes('owner') || e.roles.includes('hr') || e.roles.includes('tech')) return false;
    if (e.email === 'eduardo.sotelo@chickinho.com') return false; // Global head, handled separately
    if (kitchenStaff.some(k => k._id.toString() === e._id.toString())) return false;
    if (e.email === 'marcos.oliveira@chickinho.com') return false; // Added separately
    return true;
  });

  if (marcos) fohStaff.push(marcos);

  // 2. Assign Roles & Departments
  // Managers
  if (abhishek && lxFactoryStore && lxKitchenDept) {
    await Employee.findByIdAndUpdate(abhishek._id, {
      storeId: lxFactoryStore._id,
      storeDepartmentId: lxKitchenDept._id,
      positionId: positions.find(p => p.name === 'Store Manager')?._id
    });
  }
  if (marcos && lxFactoryStore && lxFohDept) {
    await Employee.findByIdAndUpdate(marcos._id, {
      storeId: lxFactoryStore._id,
      storeDepartmentId: lxFohDept._id,
      positionId: positions.find(p => p.name === 'Store Manager')?._id
    });
  }

  if (lxFactoryStore) {
    await Store.findByIdAndUpdate(lxFactoryStore._id, {
      managers: [abhishek?._id, marcos?._id].filter(Boolean),
      employees: [...kitchenStaff, ...fohStaff].map(e => e._id)
    });
  }

  // Kitchen Assignment
  if (lxKitchenDept && lxFactoryStore) {
    for (const emp of kitchenStaff) {
      const isHead = emp.email === 'abhishek.sharma@chickinho.com';
      await Employee.findByIdAndUpdate(emp._id, {
        storeId: lxFactoryStore._id,
        storeDepartmentId: lxKitchenDept._id,
        positionId: !isHead ? positions.find(p => p.name.includes('Cook'))?._id : positions.find(p => p.name.includes('Head'))?._id
      });
    }
    await StoreDepartment.findByIdAndUpdate(lxKitchenDept._id, {
      headOfDepartment: abhishek?._id,
      employees: kitchenStaff.map(e => e._id)
    });
  }

  // FOH Assignment
  if (lxFohDept && lxFactoryStore) {
    for (const emp of fohStaff) {
      const isHead = emp.email === 'marcos.oliveira@chickinho.com';
      await Employee.findByIdAndUpdate(emp._id, {
        storeId: lxFactoryStore._id,
        storeDepartmentId: lxFohDept._id,
        positionId: !isHead ? positions.find(p => p.name.includes('Server'))?._id : positions.find(p => p.name.includes('Manager'))?._id
      });
    }
    await StoreDepartment.findByIdAndUpdate(lxFohDept._id, {
      headOfDepartment: marcos?._id,
      employees: fohStaff.map(e => e._id)
    });
  }


  // Assign regular employees to stores and departments (excluding Lx Factory and assigned named employees)
  let employeeIndex = 0;

  for (const store of stores) {
    if (store.name === 'Lx Factory') continue;

    // Skip if employee is already assigned (e.g. named employees at Lx Factory)
    // We filter `regularEmployees` dynamically

    const storeDepts = storeDepartments.filter(sd =>
      sd.storeId.toString() === store._id.toString()
    );

    // Assign managers and sub-managers
    const managers: any[] = [];
    const subManagers: any[] = [];

    for (let i = 0; i < storeDepts.length && employeeIndex < regularEmployees.length; i++) {
      // ... (rest of logic for random assignment using regularEmployees list)
      // Check if regularEmployees[employeeIndex] is already assigned to Lx Factory
      let candidate = regularEmployees[employeeIndex];
      // Skip named employees (they are for Lx Factory)
      while (candidate) {
        // Named employees don't have the random pattern "-number@" in email
        const isRandom = candidate.email.match(/-\d+@/);

        // Also explicitly check for specific emails just in case
        const isReserved =
          candidate.email === 'tech@chickinho.com' ||
          candidate.email === 'asish.poudel@chickinho.com' ||
          !isRandom; // All non-randoms are "Named" and thus reserved for Lx Factory

        if (isReserved) {
          employeeIndex++;
          candidate = regularEmployees[employeeIndex];
        } else {
          break;
        }
      }

      if (!candidate || employeeIndex >= regularEmployees.length) break;

      const dept = storeDepts[i];
      const deptEmployees: any[] = [];

      // Assign head of department
      if (employeeIndex < regularEmployees.length) {
        const head = regularEmployees[employeeIndex];
        employeeIndex++;
        await Employee.findByIdAndUpdate(head._id, {
          storeId: store._id,
          storeDepartmentId: dept._id,
          positionId: positions.find(p => p.name.includes('Manager'))?._id
        });
        deptEmployees.push(head._id);
        managers.push(head._id);

        await StoreDepartment.findByIdAndUpdate(dept._id, {
          $addToSet: { headOfDepartment: head._id }
        });
      }

      // Assign sub-head
      if (employeeIndex < regularEmployees.length) {
        const subHead = regularEmployees[employeeIndex];
        employeeIndex++;
        await Employee.findByIdAndUpdate(subHead._id, {
          storeId: store._id,
          storeDepartmentId: dept._id,
          positionId: positions.find(p => p.name.includes('Assistant') || p.name.includes('Sous'))?._id
        });
        deptEmployees.push(subHead._id);
        subManagers.push(subHead._id);

        await StoreDepartment.findByIdAndUpdate(dept._id, {
          $addToSet: { subHead: subHead._id }
        });
      }

      // Assign regular employees to department (4-6 per department to average ~20 per store)
      const deptEmployeeCount = randomInt(4, 6);
      for (let j = 0; j < deptEmployeeCount && employeeIndex < regularEmployees.length; j++) {
        const emp = regularEmployees[employeeIndex];
        employeeIndex++;

        const deptPosition = positions.find(p =>
          p.name.includes(dept.name.split(' - ')[0]) ||
          (dept.name.includes('Kitchen') && p.name.includes('Cook'))
        );

        await Employee.findByIdAndUpdate(emp._id, {
          storeId: store._id,
          storeDepartmentId: dept._id,
          positionId: deptPosition?._id
        });
        deptEmployees.push(emp._id);

        await StoreDepartment.findByIdAndUpdate(dept._id, {
          $addToSet: { employees: emp._id }
        });
      }

      // Update department with all employees
      await StoreDepartment.findByIdAndUpdate(dept._id, {
        employees: deptEmployees
      });
    }

    // Update store with managers and all employees
    const allStoreEmployees = [
      ...managers,
      ...subManagers,
      ...storeDepts.flatMap(d => d.employees || [])
    ];

    await Store.findByIdAndUpdate(store._id, {
      managers: managers.slice(0, 1), // First manager as main manager
      subManagers: subManagers.slice(0, 1), // First sub-manager
      employees: allStoreEmployees
    });

    // Update global departments with employees
    for (const dept of storeDepts) {
      const globalDept = data.globalDepartments?.find(
        gd => gd._id.toString() === dept.globalDepartmentId?.toString()
      );
      if (globalDept) {
        await globalDept.updateOne({
          $addToSet: { employees: { $each: dept.employees || [] } }
        });
      }
    }

    if (employeeIndex % 50 === 0) {
      console.log(`   - Assigned up to ${employeeIndex} / ${regularEmployees.length} employees...`);
    }
  }

  // CATCH-ALL: Assign any remaining regular employees
  if (employeeIndex < regularEmployees.length) {
    console.log(`⚠️  ${regularEmployees.length - employeeIndex} employees remaining unassigned. Distributing round-robin...`);

    // Filter out Lx Factory from catch-all too, unless necessary?
    // Just use all stores except Lx Factory
    const availableStores = stores.filter(s => s.name !== 'Lx Factory');
    let storeCursor = 0;

    while (employeeIndex < regularEmployees.length) {
      if (availableStores.length === 0) break;

      const store = availableStores[storeCursor % availableStores.length];
      const emp = regularEmployees[employeeIndex];
      const storeDepts = storeDepartments.filter(sd => sd.storeId.toString() === store._id.toString());

      if (storeDepts.length > 0) {
        const dept = pick(storeDepts);
        const deptPosition = positions.find(p => p.name.includes(dept.name.split(' - ')[0])) || positions[0];

        await Employee.findByIdAndUpdate(emp._id, {
          storeId: store._id,
          storeDepartmentId: dept._id,
          positionId: deptPosition?._id
        });
        await StoreDepartment.findByIdAndUpdate(dept._id, {
          $addToSet: { employees: emp._id }
        });
        await Store.findByIdAndUpdate(store._id, {
          $addToSet: { employees: emp._id }
        });
      }

      employeeIndex++;
      storeCursor++;
    }
  }
}
