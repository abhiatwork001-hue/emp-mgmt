import mongoose from 'mongoose';
import { Employee } from '../src/lib/models';
import dbConnect from '../src/lib/db';
import bcrypt from 'bcryptjs';

async function verifyLogin() {
    await dbConnect();

    const email = "admin@chick.com";
    const password = "123456";

    console.log(`Attempting login for ${email}...`);
    const employee = await Employee.findOne({ email });

    if (!employee) {
        console.error("User not found!");
        process.exit(1);
    }

    console.log("User found:", employee.email);

    const isMatch = await bcrypt.compare(password, employee.password || "");

    if (isMatch) {
        console.log("Password match: SUCCESS");
        console.log("Roles/Permissions check:");
        console.log("Role:", employee.role);
        console.log("Position ID:", employee.positionId);
    } else {
        console.error("Password match: FAILED");
        process.exit(1);
    }

    process.exit(0);
}

verifyLogin().catch(err => {
    console.error(err);
    process.exit(1);
});
