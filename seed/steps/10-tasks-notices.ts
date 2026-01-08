import { Task, Notice, Employee, Store, StoreDepartment, GlobalDepartment } from '../../src/lib/models';
import { slugify } from '../utils/slug';
import { pick, pickMultiple, randomBoolean, randomInt, randomDateInRange, isPast } from '../utils/random';
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

export async function seedTasksAndNotices(data: SeedData): Promise<SeedData> {
  console.log('📋 Step 10: Creating Tasks and Notices...');
  
  const employees = data.employees || [];
  const stores = data.stores || [];
  const storeDepartments = data.storeDepartments || [];
  const globalDepartments = data.globalDepartments || [];
  
  const now = new Date();
  const yearStart = new Date(2024, 0, 1);
  
  // Create Tasks
  const taskTitles = [
    'Complete safety training',
    'Update employee handbook',
    'Review monthly reports',
    'Prepare quarterly budget',
    'Organize team building event',
    'Update store policies',
    'Conduct performance reviews',
    'Inventory audit',
    'Staff meeting preparation',
    'Customer feedback analysis'
  ];
  
  let taskCount = 0;
  
  for (let i = 0; i < 50; i++) {
    const title = pick(taskTitles) + ` ${i > 0 ? `#${i}` : ''}`;
    const createdBy = pick(employees.filter(e => 
      e.roles?.includes('hr') || e.roles?.includes('manager') || e.roles?.includes('owner')
    )) || pick(employees);
    
    const assignmentType = pick(['individual', 'store', 'store_department', 'global_department']);
    let assignedTo: any[] = [];
    
    if (assignmentType === 'individual') {
      assignedTo = [{ type: 'individual', id: pick(employees)._id }];
    } else if (assignmentType === 'store') {
      assignedTo = [{ type: 'store', id: pick(stores)._id }];
    } else if (assignmentType === 'store_department') {
      assignedTo = [{ type: 'store_department', id: pick(storeDepartments)._id }];
    } else {
      assignedTo = [{ type: 'global_department', id: pick(globalDepartments)._id }];
    }
    
    const deadline = randomDateInRange(yearStart, new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000));
    const statuses: ('todo' | 'in_progress' | 'completed')[] = ['todo', 'in_progress', 'completed'];
    let status = pick(statuses);
    
    // If deadline is past, more likely to be completed or in progress
    if (isPast(deadline)) {
      status = pick(['completed', 'in_progress', 'todo']); // Some overdue
    }
    
    const priority = pick(['low', 'medium', 'high']);
    
    const todos = Array.from({ length: randomInt(2, 5) }, (_, i) => ({
      text: `Task item ${i + 1}`,
      completed: status === 'completed' ? randomBoolean(0.8) : randomBoolean(0.3),
      completedBy: status === 'completed' ? [pick(employees)._id] : []
    }));
    
    const comments = Array.from({ length: randomInt(0, 3) }, () => ({
      userId: pick(employees)._id,
      userName: `${pick(employees).firstName} ${pick(employees).lastName}`,
      text: faker.lorem.sentence(),
      createdAt: randomDateInRange(yearStart, now)
    }));
    
    const readBy = pickMultiple(employees, randomInt(1, 5)).map((e: any) => e._id);
    
    const completedBy = status === 'completed' 
      ? [{
          userId: pick(employees)._id,
          completedAt: randomDateInRange(deadline, now)
        }]
      : [];
    
    const task = await Task.create({
      title,
      slug: slugify(title),
      description: faker.lorem.paragraph(),
      createdBy: createdBy._id,
      assignedTo,
      deadline,
      priority,
      status,
      todos,
      comments,
      readBy,
      completedBy,
      requiresSubmission: randomBoolean(0.3),
      requiredFileNames: randomBoolean(0.3) ? ['report.pdf', 'photos.zip'] : [],
      submissions: status === 'completed' && randomBoolean(0.5) ? [{
        userId: pick(employees)._id,
        fileUrl: '/uploads/submission.pdf',
        fileName: 'submission.pdf',
        requirementName: 'report.pdf',
        submittedAt: randomDateInRange(deadline, now)
      }] : []
    });
    
    taskCount++;
  }
  
  // Create Notices
  const noticeTitles = [
    'New company policy update',
    'Holiday schedule announcement',
    'Safety protocol reminder',
    'Team meeting scheduled',
    'Performance review period',
    'Benefits enrollment open',
    'Store closure notice',
    'New employee welcome',
    'Training session announcement',
    'Urgent: System maintenance'
  ];
  
  let noticeCount = 0;
  
  for (let i = 0; i < 30; i++) {
    const title = pick(noticeTitles) + ` ${i > 0 ? `#${i}` : ''}`;
    const createdBy = pick(employees.filter(e => 
      e.roles?.includes('hr') || e.roles?.includes('manager') || e.roles?.includes('owner')
    )) || pick(employees);
    
    const targetScope = pick(['global', 'store', 'department', 'store_department', 'role_group']);
    let targetId: any = undefined;
    let targetRole: string | undefined = undefined;
    
    if (targetScope === 'store') {
      targetId = pick(stores)._id;
    } else if (targetScope === 'department') {
      targetId = pick(globalDepartments)._id;
    } else if (targetScope === 'store_department') {
      targetId = pick(storeDepartments)._id;
    } else if (targetScope === 'role_group') {
      targetRole = pick(['employee', 'manager', 'hr']);
    }
    
    const priority = pick(['normal', 'urgent']);
    const expiresAt = randomBoolean(0.5) 
      ? randomDateInRange(now, new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000))
      : undefined;
    
    const comments = Array.from({ length: randomInt(0, 5) }, () => ({
      userId: pick(employees)._id,
      content: faker.lorem.sentence(),
      createdAt: randomDateInRange(yearStart, now)
    }));
    
    const notice = await Notice.create({
      title,
      slug: slugify(title),
      content: faker.lorem.paragraphs(2),
      attachments: randomBoolean(0.3) ? ['/uploads/notice.pdf'] : [],
      priority,
      targetScope: targetScope as any,
      targetId,
      targetRole,
      visibleToAdmin: randomBoolean(0.2),
      expiresAt,
      createdBy: createdBy._id,
      comments
    });
    
    noticeCount++;
  }
  
  console.log(`✅ Created ${taskCount} tasks`);
  console.log(`✅ Created ${noticeCount} notices`);
  
  return data;
}

