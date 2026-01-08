import { Role, Position } from '../../src/lib/models';
import { ROLE_NAMES, POSITION_NAMES, GLOBAL_DEPARTMENTS } from '../constants';
import { slugify } from '../utils/slug';

export interface SeedData {
  company?: any;
  roles?: any[];
  positions?: any[];
}

export async function seedRolesAndPositions(data: SeedData): Promise<SeedData> {
  console.log('👥 Step 2: Creating Roles and Positions...');
  
  // Create Roles
  const roles = await Promise.all(
    ROLE_NAMES.map(name =>
      Role.create({
        name,
        description: `${name.charAt(0).toUpperCase() + name.slice(1)} role`,
        permissions: getPermissionsForRole(name),
        isSystemRole: name === 'owner' || name === 'hr',
        active: true
      })
    )
  );

  console.log(`✅ Created ${roles.length} roles`);

  // Create Positions for each department
  const positions: any[] = [];
  
  for (const deptName of GLOBAL_DEPARTMENTS) {
    const deptPositions = POSITION_NAMES[deptName as keyof typeof POSITION_NAMES] || [];
    
    for (const posName of deptPositions) {
      const position = await Position.create({
        name: posName,
        slug: slugify(posName),
        level: getPositionLevel(posName),
        roles: roles.filter(r => shouldHaveRole(posName, r.name)).map(r => r._id),
        permissions: getPermissionsForPosition(posName),
        isStoreSpecific: false,
        isDepartmentSpecific: true,
        active: true
      });
      positions.push(position);
    }
  }

  console.log(`✅ Created ${positions.length} positions`);

  return {
    ...data,
    roles,
    positions
  };
}

function getPermissionsForRole(roleName: string): string[] {
  const permissions: Record<string, string[]> = {
    owner: ['*'], // All permissions
    hr: ['manage_employees', 'manage_schedules', 'approve_vacations', 'view_reports'],
    manager: ['manage_schedules', 'approve_vacations', 'view_reports', 'manage_tasks'],
    tech: ['manage_system', 'view_reports', 'manage_tasks', 'view_schedule'],
    employee: ['view_schedule', 'request_vacation', 'view_tasks']
  };
  return permissions[roleName] || [];
}

function getPermissionsForPosition(positionName: string): string[] {
  if (positionName.includes('Manager')) {
    return ['manage_schedules', 'approve_vacations', 'view_reports'];
  }
  return ['view_schedule', 'request_vacation'];
}

function getPositionLevel(positionName: string): number {
  if (positionName.includes('Head') || positionName.includes('Manager')) return 5;
  if (positionName.includes('Sous') || positionName.includes('Supervisor')) return 4;
  if (positionName.includes('Assistant')) return 3;
  return 2;
}

function shouldHaveRole(positionName: string, roleName: string): boolean {
  if (positionName.includes('Manager')) {
    return roleName === 'manager' || roleName === 'hr' || roleName === 'owner';
  }
  return roleName === 'employee';
}

