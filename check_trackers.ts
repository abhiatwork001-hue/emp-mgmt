
require('dotenv').config({ path: '.env' });

async function checkTrackers() {
    try {
        const { default: dbConnect } = await import('./src/lib/db');
        const { Employee } = await import('./src/lib/models');
        const mongoose = require('mongoose');
        await dbConnect();

        const lxFactoryId = "695fef7f6f45fb744b714e25";

        console.log(`\n--- Checking Vacations Trackers in LX Factory ---`);
        const employees = await Employee.find({ storeId: lxFactoryId }).select("firstName lastName vacationTracker").lean();

        employees.forEach(e => {
            console.log(`- ${e.firstName} ${e.lastName}:`);
            console.log(`  Tracker: ${JSON.stringify(e.vacationTracker)}`);
        });

    } catch (e) {
        console.error("Error:", e);
    }
}

checkTrackers();
