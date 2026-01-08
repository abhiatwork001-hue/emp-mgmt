import { GlobalDepartment, Company } from '../../src/lib/models';
import { GLOBAL_DEPARTMENTS } from '../constants';
import { slugify } from '../utils/slug';

export interface SeedData {
  company?: any;
  roles?: any[];
  positions?: any[];
  globalDepartments?: any[];
}

export async function seedGlobalDepartments(data: SeedData): Promise<SeedData> {
  console.log('🏢 Step 3: Creating Global Departments...');
  
  const departments = await Promise.all(
    GLOBAL_DEPARTMENTS.map(name =>
      GlobalDepartment.create({
        name,
        slug: slugify(name),
        description: `${name} department`,
        hasHead: name !== 'Drivers',
        departmentHead: [],
        subHead: [],
        employees: [],
        defaultPositions: data.positions
          ?.filter(p => {
            const deptPositions = ['Management', 'Kitchen', 'Front of the House', 'Drivers'];
            const deptIndex = GLOBAL_DEPARTMENTS.indexOf(name);
            return p.name.includes(name) || (name === 'Management' && p.name.includes('Manager'));
          })
          .map(p => p._id) || [],
        active: true
      })
    )
  );

  // Update company with departments
  if (data.company) {
    await Company.findByIdAndUpdate(data.company._id, {
      globalDepartments: departments.map(d => d._id)
    });
  }

  console.log(`✅ Created ${departments.length} global departments`);

  return {
    ...data,
    globalDepartments: departments
  };
}

