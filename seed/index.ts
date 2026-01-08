import 'dotenv/config';
import mongoose from 'mongoose';
import { seedCompany } from './steps/01-company';
import { seedRolesAndPositions } from './steps/02-roles-positions';
import { seedGlobalDepartments } from './steps/03-departments';
import { seedStores } from './steps/04-stores';
import { seedStoreDepartments } from './steps/05-store-departments';
import { seedEmployees } from './steps/06-employees';
import { seedPositionHistory } from './steps/07-position-history';
import { seedSchedules } from './steps/08-schedules';
import { seedVacationsAndAbsences } from './steps/09-vacations-absences';
import { seedTasksAndNotices } from './steps/10-tasks-notices';
import { seedChat } from './steps/11-chat';
import { seedAuditLogs } from './steps/12-audit-logs';

interface SeedData {
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

async function seed() {
  console.log('🐔 Starting CHICKINHO Database Seed...\n');

  // Check for MongoDB URI
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI missing in .env file');
  }

  // Connect to MongoDB
  try {
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ Connection Error:', error);
    process.exit(1);
  }

  let seedData: SeedData = {};

  try {
    // Step 1: Company
    seedData.company = await seedCompany();
    console.log('');

    // Step 2: Roles and Positions
    seedData = await seedRolesAndPositions(seedData);
    console.log('');

    // Step 3: Global Departments
    seedData = await seedGlobalDepartments(seedData);
    console.log('');

    // Step 4: Stores
    seedData = await seedStores(seedData);
    console.log('');

    // Step 5: Store Departments
    seedData = await seedStoreDepartments(seedData);
    console.log('');

    // Step 6: Employees
    seedData = await seedEmployees(seedData);
    console.log('');

    // Step 7: Position History
    seedData = await seedPositionHistory(seedData);
    console.log('');

    // Step 8: Vacations and Absences (Run before schedules to ensure vacations exist)
    seedData = await seedVacationsAndAbsences(seedData);
    console.log('');

    // Step 9: Schedules
    seedData = await seedSchedules(seedData);
    console.log('');

    // Step 10: Tasks and Notices
    seedData = await seedTasksAndNotices(seedData);
    console.log('');

    // Step 11: Chat
    seedData = await seedChat(seedData);
    console.log('');

    // Step 12: Audit Logs
    seedData = await seedAuditLogs(seedData);
    console.log('');

    console.log('🎉 Seed completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Company: ${seedData.company?.name}`);
    console.log(`   Stores: ${seedData.stores?.length || 0}`);
    console.log(`   Departments: ${seedData.globalDepartments?.length || 0}`);
    console.log(`   Store Departments: ${seedData.storeDepartments?.length || 0}`);
    console.log(`   Employees: ${seedData.employees?.length || 0}`);
    console.log(`   Schedules: ${seedData.schedules?.length || 0}`);
    console.log(`   Shift Definitions: ${seedData.shiftDefinitions?.length || 0}`);

  } catch (error) {
    console.error('❌ Seed Error:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

// Run seed
seed().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

