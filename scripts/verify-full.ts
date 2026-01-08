
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Employee, Schedule, Store, StoreDepartment } from '../src/lib/models';

dotenv.config({ path: '.env.local' });
if (!process.env.MONGODB_URI) dotenv.config({ path: '.env' });

async function verify() {
    if (!process.env.MONGODB_URI) {
        console.error("MONGODB_URI not found");
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to DB");

        // 1. Employee Assignment
        const totalEmployees = await Employee.countDocuments({});
        const unassignedStore = await Employee.countDocuments({ storeId: { $exists: false } }); // or null
        const unassignedStoreNull = await Employee.countDocuments({ storeId: null });
        const unassignedDept = await Employee.countDocuments({ storeDepartmentId: { $exists: false } });
        const unassignedDeptNull = await Employee.countDocuments({ storeDepartmentId: null });

        console.log(`\n--- Employee Assignments ---`);
        console.log(`Total Employees: ${totalEmployees}`);
        console.log(`Unassigned Store (missing field): ${unassignedStore}`);
        console.log(`Unassigned Store (null): ${unassignedStoreNull}`);
        console.log(`Unassigned Dept (missing field): ${unassignedDept}`);
        console.log(`Unassigned Dept (null): ${unassignedDeptNull}`);

        if (unassignedStore > 0 || unassignedStoreNull > 0) {
            console.error("❌ FAILURE: Some employees are not assigned to a store!");
        } else {
            console.log("✅ All employees assigned to a store.");
        }

        if (unassignedDept > 0 || unassignedDeptNull > 0) {
            console.error("❌ FAILURE: Some employees are not assigned to a department!");
        } else {
            console.log("✅ All employees assigned to a department.");
        }

        // 2. Lx Factory Schedules
        const lxFactory = await Store.findOne({ name: "Lx Factory" });
        if (!lxFactory) {
            console.error("❌ Lx Factory store not found!");
        } else {
            const schedules = await Schedule.countDocuments({ storeId: lxFactory._id });
            console.log(`\n--- Lx Factory Schedules ---`);
            console.log(`Lx Factory ID: ${lxFactory._id}`);
            console.log(`Schedules found: ${schedules}`);

            if (schedules === 0) {
                console.error("❌ FAILURE: No schedules found for Lx Factory.");
            } else {
                const sample = await Schedule.findOne({ storeId: lxFactory._id }).populate('days.shifts.employees');
                console.log(`✅ Success! Found ${schedules} schedules.`);
                if (sample) {
                    console.log(`Sample Schedule Week ${sample.weekNumber}: ${sample.status}`);
                    const day1 = sample.days[0];
                    console.log(`Day 1 Shifts: ${day1.shifts.length}`);
                    day1.shifts.forEach((s: any) => {
                        console.log(`  - ${s.shiftName} (${s.startTime}-${s.endTime}): ${s.employees.length} employees`);
                    });
                }
            }
        }

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

verify();
