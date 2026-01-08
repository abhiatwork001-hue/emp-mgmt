/**
 * Database Reset Script
 * WARNING: This will delete ALL data from the database
 * Use with caution!
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import * as readline from 'readline';

// Import all models to ensure they're registered
import {
    Company,
    Employee,
    Store,
    StoreDepartment,
    GlobalDepartment,
    Position,
    Role,
    Schedule,
    VacationRequest,
    VacationRecord,
    AbsenceRequest,
    AbsenceRecord,
    OvertimeRequest,
    ExtraHourRequest,
    ShiftCoverageRequest,
    ShiftSwapRequest,
    ShiftDefinition,
    Task,
    Notice,
    Notification,
    Message,
    Conversation,
    Problem,
    Note,
    Reminder,
    Supplier,
    Product,
    StoreCredential,
    TipsDistribution,
    Category,
    Food,
    ActionLog,
} from '../src/lib/models';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/your-database';

async function clearDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        const collections = [
            { name: 'Companies', model: Company },
            { name: 'Employees', model: Employee },
            { name: 'Stores', model: Store },
            { name: 'StoreDepartments', model: StoreDepartment },
            { name: 'GlobalDepartments', model: GlobalDepartment },
            { name: 'Positions', model: Position },
            { name: 'Roles', model: Role },
            { name: 'Schedules', model: Schedule },
            { name: 'VacationRequests', model: VacationRequest },
            { name: 'VacationRecords', model: VacationRecord },
            { name: 'AbsenceRequests', model: AbsenceRequest },
            { name: 'AbsenceRecords', model: AbsenceRecord },
            { name: 'OvertimeRequests', model: OvertimeRequest },
            { name: 'ExtraHourRequests', model: ExtraHourRequest },
            { name: 'ShiftCoverageRequests', model: ShiftCoverageRequest },
            { name: 'ShiftSwapRequests', model: ShiftSwapRequest },
            { name: 'ShiftDefinitions', model: ShiftDefinition },
            { name: 'Tasks', model: Task },
            { name: 'Notices', model: Notice },
            { name: 'Notifications', model: Notification },
            { name: 'Messages', model: Message },
            { name: 'Conversations', model: Conversation },
            { name: 'Problems', model: Problem },
            { name: 'Notes', model: Note },
            { name: 'Reminders', model: Reminder },
            { name: 'Suppliers', model: Supplier },
            { name: 'Products', model: Product },
            { name: 'StoreCredentials', model: StoreCredential },
            { name: 'TipsDistributions', model: TipsDistribution },
            { name: 'Categories', model: Category },
            { name: 'Foods', model: Food },
            { name: 'ActionLogs', model: ActionLog },
        ];

        console.log('\n🗑️  Starting database cleanup...\n');

        for (const collection of collections) {
            try {
                const count = await collection.model.countDocuments();
                if (count > 0) {
                    await collection.model.deleteMany({});
                    console.log(`✅ Deleted ${count} documents from ${collection.name}`);
                } else {
                    console.log(`⚪ ${collection.name} was already empty`);
                }
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.log(`⚠️  ${collection.name}: ${errorMessage}`);
            }
        }

        console.log('\n✅ Database cleared successfully!');
        console.log('📊 All collections are now empty\n');

    } catch (error) {
        console.error('❌ Error clearing database:', error);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
        process.exit(0);
    }
}

// Confirmation prompt
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

console.log('\n⚠️  WARNING: This will DELETE ALL DATA from your database!');
console.log('📍 Database:', MONGODB_URI);
console.log('\n');

rl.question('Are you sure you want to continue? (yes/no): ', (answer) => {
    if (answer.toLowerCase() === 'yes') {
        rl.close();
        clearDatabase();
    } else {
        console.log('❌ Operation cancelled');
        rl.close();
        process.exit(0);
    }
});
