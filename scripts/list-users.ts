import "dotenv/config";
import mongoose from "mongoose";
import { Employee, Role } from "../src/lib/models";

async function main() {
    if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI missing");
    await mongoose.connect(process.env.MONGODB_URI);

    const roles = ["owner", "tech", "hr", "store_manager", "department_head", "store_department_head"];

    console.log("\n=== KEY ACCOUNTS ===");
    console.log("Updating isPasswordChanged to TRUE for all listed users...\n");

    const usersToUpdateIds: string[] = [];

    for (const role of roles) {
        console.log(`\n--- ${role.toUpperCase()} ---`);
        const employees = await Employee.find({ roles: role }); // Note: roles is array, but simple match works if it contains

        if (employees.length === 0) {
            console.log("No employees found.");
            continue;
        }

        for (const emp of employees) {
            console.log(`Name: ${emp.firstName} ${emp.lastName}`);
            console.log(`Roles: ${JSON.stringify(emp.roles)}`);
            console.log(`Email: ${emp.email}`);
            console.log(`Pass: 123456`);
            console.log(`ID:   ${emp._id}`);
            console.log("-");
            usersToUpdateIds.push(emp._id.toString());
        }
    }

    console.log("\n--- RANDOM STORE EMPLOYEES (20) ---");
    const regularEmployees = await Employee.find({ roles: "employee" }).limit(20);
    for (const emp of regularEmployees) {
        console.log(`[Employee] ${emp.email} (${emp.firstName} ${emp.lastName})`);
        usersToUpdateIds.push(emp._id.toString());
    }

    // Update all found users
    if (usersToUpdateIds.length > 0) {
        const res = await Employee.updateMany(
            { _id: { $in: usersToUpdateIds } },
            { $set: { isPasswordChanged: true } }
        );
        console.log(`\nUpdated ${res.modifiedCount} users to hasPasswordChanged=true.`);
    }

    process.exit(0);
}

main().catch(console.error);
