# Database Seed Script

This directory contains a comprehensive seed script for populating the Chickinho database with realistic test data.

## Structure

```
/seed
 ├─ index.ts                // Main orchestrator
 ├─ constants.ts            // Company, stores, departments, employee names
 ├─ utils/
 │   ├─ random.ts           // Random data generation utilities
 │   ├─ dates.ts            // Date manipulation utilities
 │   ├─ slug.ts             // Slug generation
 │   └─ nif.ts              // Portuguese NIF generation
 ├─ steps/
 │   ├─ 01-company.ts       // Creates company
 │   ├─ 02-roles-positions.ts // Creates roles and positions
 │   ├─ 03-departments.ts   // Creates global departments
 │   ├─ 04-stores.ts        // Creates stores
 │   ├─ 05-store-departments.ts // Creates store departments
 │   ├─ 06-employees.ts     // Creates employees (owners, HR, named, random)
 │   ├─ 07-position-history.ts // Creates position history
 │   ├─ 08-schedules.ts     // Creates schedules (2025 + Q1 2026)
 │   ├─ 09-vacations-absences.ts // Creates vacation and absence records
 │   ├─ 10-tasks-notices.ts // Creates tasks and notices
 │   ├─ 11-chat.ts          // Creates chat conversations and messages
 │   └─ 12-audit-logs.ts    // Creates audit logs
```

## Usage

1. Make sure your `.env` file has `MONGODB_URI` set
2. Run the seed script:

```bash
npm run seed
```

Or directly:

```bash
npx ts-node --project tsconfig.seed.json seed/index.ts
```

## What Gets Created

- **1 Company**: Chickinho
- **5 Stores**: Lx Factory, Campolide, Linda A Velha, Telheiras, Ubbo
- **4 Global Departments**: Management, Kitchen, Front of the House, Drivers
- **~16 Store Departments**: (4 stores × 4 departments, excluding Lx Factory)
- **114 Employees**:
  - 2 Owners (Jose Cotta Maria, Fransisco Castello)
  - 2 HR (Sergio Loureiro, Rosilene Silva)
  - 10 Named employees
  - 100 Random employees
- **Roles & Positions**: Based on departments
- **Schedules**: Full year 2025 + Q1 2026 for all store departments
- **Vacations & Absences**: Historical and current requests
- **Tasks & Notices**: Various statuses (pending, completed, overdue)
- **Chat**: Direct and group conversations with messages
- **Audit Logs**: Activity history

## Features

- Realistic data distribution
- Proper relationships between models
- Various statuses (pending, approved, rejected)
- Historical data going back to 2024
- Current data showing pending approvals
- Some stores missing schedules (to show alerts)
- Employees currently on vacation
- Overdue tasks
- Active chat conversations

## Notes

- All employees have password: `password123`
- Data spans from 2024 to March 2026
- Some stores may not have schedules (intentional for testing alerts)
- Vacation and absence requests have various statuses
- Tasks include completed, in-progress, and overdue items

