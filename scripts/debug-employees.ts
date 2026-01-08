
import 'dotenv/config';
import { getAllEmployees } from "../src/lib/actions/employee.actions";
import connectToDB from "../src/lib/db";

async function checkDuplicates() {
    await connectToDB();
    console.log("Fetching all employees...");

    // Simulate the call made by the page
    const { employees } = await getAllEmployees({});
    console.log(`Received ${employees.length} employees.`);

    const seenIds = new Set();
    const duplicates: any[] = [];

    employees.forEach((e: any) => {
        if (seenIds.has(e._id)) {
            duplicates.push(e);
        } else {
            seenIds.add(e._id);
        }
    });

    if (duplicates.length > 0) {
        console.error(`Found ${duplicates.length} duplicates!`);
        console.log("Sample Duplicate:", duplicates[0]);
    } else {
        console.log("No duplicates found by ID.");
    }

    // Check if names duplicated?
    const names = employees.map((e: any) => `${e.firstName}Ms. ${e.lastName}`);
    // Naive check
    // ...
    process.exit(0);
}

checkDuplicates();
