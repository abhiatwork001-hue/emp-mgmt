
require('dotenv').config({ path: '.env' });

async function debugData() {
    try {
        const { default: dbConnect } = await import('./src/lib/db');
        const { Employee, VacationRequest, AbsenceRequest, Store } = await import('./src/lib/models');
        const mongoose = require('mongoose');
        await dbConnect();

        const lxFactoryId = "695fef7f6f45fb744b714e25";
        const emailToFind = "abhishek.sharma@chickinho.com";

        console.log(`--- Checking Store: LX Factory (${lxFactoryId}) ---`);
        const store = await Store.findById(lxFactoryId).lean();
        console.log(`Store Name: ${store?.name}, Managers: ${store?.managers}`);

        console.log(`\n--- Checking Employees in LX Factory ---`);
        const employees = await Employee.find({ storeId: lxFactoryId }).select("firstName lastName email roles").lean();
        console.log(`Found ${employees.length} employees in this store.`);
        employees.forEach(e => {
            console.log(` - ${e.firstName} ${e.lastName} (${e.email}) [${e._id}] Roles: ${e.roles}`);
        });

        const empIds = employees.map(e => e._id);

        console.log(`\n--- Checking Vacation Requests for these Employees ---`);
        const vRequests = await VacationRequest.find({ employeeId: { $in: empIds } }).lean();
        console.log(`Found ${vRequests.length} vacation requests.`);
        vRequests.forEach(r => {
            const emp = employees.find(e => e._id.toString() === r.employeeId.toString());
            console.log(` - ${emp?.firstName} ${emp?.lastName}: ${r.status} (${r.requestedFrom.toDateString()} to ${r.requestedTo.toDateString()})`);
        });

        console.log(`\n--- Checking Absence Requests for these Employees ---`);
        const aRequests = await AbsenceRequest.find({ employeeId: { $in: empIds } }).lean();
        console.log(`Found ${aRequests.length} absence requests.`);
        aRequests.forEach(r => {
            const emp = employees.find(e => e._id.toString() === r.employeeId.toString());
            console.log(` - ${emp?.firstName} ${emp?.lastName}: ${r.status} on ${r.date.toDateString()} reason: ${r.reason}`);
        });

    } catch (e) {
        console.error("Error:", e);
    } finally {
        const mongoose = require('mongoose');
        // await mongoose.disconnect();
    }
}

debugData();
