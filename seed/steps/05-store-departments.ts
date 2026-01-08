import { StoreDepartment, Store, GlobalDepartment } from '../../src/lib/models';
import { GLOBAL_DEPARTMENTS, STORE_NAMES } from '../constants';
import { slugify } from '../utils/slug';

export interface SeedData {
  company?: any;
  roles?: any[];
  positions?: any[];
  globalDepartments?: any[];
  stores?: any[];
  storeDepartments?: any[];
}

export async function seedStoreDepartments(data: SeedData): Promise<SeedData> {
  console.log('🏬 Step 5: Creating Store Departments...');

  const storeDepartments: any[] = [];

  // Create departments for all stores
  const storesToDept = data.stores || [];

  for (const store of storesToDept) {
    const globalDepts = data.globalDepartments || [];

    // Use default logic for most stores
    const departmentsToCreate = (store.name === "Lx Factory")
      ? GLOBAL_DEPARTMENTS.filter(name => ["Kitchen", "Front of the House"].includes(name))
      : GLOBAL_DEPARTMENTS;

    const filteredGlobalDepts = globalDepts.filter((gd: any) => departmentsToCreate.includes(gd.name));

    for (const globalDept of filteredGlobalDepts) {
      const storeDept = await StoreDepartment.create({
        storeId: store._id,
        globalDepartmentId: globalDept._id,
        name: `${globalDept.name} - ${store.name}`,
        slug: slugify(`${globalDept.name}-${store.name}`),
        description: `${globalDept.name} department at ${store.name}`,
        headOfDepartment: [],
        subHead: [],
        employees: [],
        positionsAllowed: data.positions
          ?.filter(p => {
            const deptName = globalDept.name;
            if (deptName === 'Management') {
              return p.name.includes('Manager');
            }
            return p.name.includes(deptName) || p.name.includes('Kitchen') && deptName === 'Kitchen';
          })
          .map(p => p._id) || [],
        minEmployees: 2,
        maxEmployees: 20,
        targetEmployees: 5,
        active: true
      });

      storeDepartments.push(storeDept);
    }
  }

  console.log(`✅ Created ${storeDepartments.length} store departments`);

  return {
    ...data,
    storeDepartments
  };
}

