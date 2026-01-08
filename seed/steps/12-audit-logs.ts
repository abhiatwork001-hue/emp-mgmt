import { ActionLog, Employee, Store } from '../../src/lib/models';
import { pick, randomBoolean, randomInt, randomDateInRange } from '../utils/random';
import { faker } from '@faker-js/faker';

export interface SeedData {
  company?: any;
  roles?: any[];
  positions?: any[];
  globalDepartments?: any[];
  stores?: any[];
  storeDepartments?: any[];
  employees?: any[];
  shiftDefinitions?: any[];
  schedules?: any[];
}

export async function seedAuditLogs(data: SeedData): Promise<SeedData> {
  console.log('📊 Step 12: Creating Audit Logs...');
  
  const employees = data.employees || [];
  const stores = data.stores || [];
  
  const now = new Date();
  const yearStart = new Date(2024, 0, 1);
  
  const actions = [
    'employee.created',
    'employee.updated',
    'employee.deleted',
    'schedule.created',
    'schedule.approved',
    'schedule.rejected',
    'schedule.published',
    'vacation.requested',
    'vacation.approved',
    'vacation.rejected',
    'absence.reported',
    'absence.approved',
    'task.created',
    'task.completed',
    'notice.published',
    'store.created',
    'store.updated',
    'department.created',
    'position.assigned',
    'login.success',
    'login.failed',
    'password.changed',
    'settings.updated'
  ];
  
  let logCount = 0;
  
  // Create audit logs for the past year
  for (let i = 0; i < 500; i++) {
    const performedBy = pick(employees);
    const action = pick(actions);
    const storeId = randomBoolean(0.6) ? pick(stores)._id : undefined;
    const createdAt = randomDateInRange(yearStart, now);
    
    // Determine target based on action
    let targetId: any = undefined;
    let targetModel: string | undefined = undefined;
    
    if (action.includes('employee')) {
      targetId = pick(employees)._id;
      targetModel = 'Employee';
    } else if (action.includes('schedule')) {
      targetModel = 'Schedule';
    } else if (action.includes('vacation') || action.includes('absence')) {
      targetModel = action.includes('vacation') ? 'VacationRequest' : 'AbsenceRequest';
    } else if (action.includes('task')) {
      targetModel = 'Task';
    } else if (action.includes('notice')) {
      targetModel = 'Notice';
    } else if (action.includes('store')) {
      targetId = pick(stores)._id;
      targetModel = 'Store';
    }
    
    const log = await ActionLog.create({
      action,
      performedBy: performedBy._id,
      storeId,
      targetId,
      targetModel,
      details: {
        description: faker.lorem.sentence(),
        metadata: {
          ip: faker.internet.ip(),
          userAgent: faker.internet.userAgent()
        }
      },
      ipAddress: faker.internet.ip(),
      userAgent: faker.internet.userAgent(),
      createdAt
    });
    
    logCount++;
  }
  
  console.log(`✅ Created ${logCount} audit logs`);
  
  return data;
}

