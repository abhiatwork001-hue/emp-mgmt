import mongoose from "mongoose";
import * as dotenv from "dotenv";
import { ROLE_DEFINITIONS } from "@/lib/constants/permissions";

// Load env vars immediately
dotenv.config({ path: ".env.local" });
dotenv.config();

async function seedRoles() {
    console.log("🌱 Seeding Roles and Permissions...");

    // Dynamic import to ensure ENV is loaded before db.ts runs
    const dbConnect = (await import("@/lib/db")).default;
    const { Role, Position } = await import("@/lib/models");

    await dbConnect();

    // 1. Create/Update Roles
    const roleMap = new Map<string, any>(); // Name -> RoleDoc

    for (const [key, def] of Object.entries(ROLE_DEFINITIONS)) {
        const role = await Role.findOneAndUpdate(
            { name: def.name },
            {
                name: def.name,
                description: def.description,
                permissions: def.permissions,
                isSystemRole: true,
                active: true
            },
            { upsert: true, new: true }
        );
        console.log(`✅ Role synced: ${role.name}`);
        roleMap.set(role.name, role);
    }

    // 2. Map Positions to Roles (Migration logic)
    // We'll look for standard position names and assign the corresponding role.
    const positionMappings = [
        { posName: "Owner", roleName: "Owner" },
        { posName: "Admin", roleName: "Admin" },
        { posName: "HR", roleName: "HR" },
        { posName: "Store Manager", roleName: "Store Manager" },
        { posName: "Department Head", roleName: "Department Head" },
        { posName: "Head of Dept", roleName: "Department Head" }, // Alias
        { posName: "Assistant Store Manager", roleName: "Store Manager" },
        { posName: "Employee", roleName: "Employee" },
        { posName: "Kitchen Staff", roleName: "Employee" },
        { posName: "Waiter", roleName: "Employee" },
        { posName: "Server", roleName: "Employee" }
    ];

    for (const mapping of positionMappings) {
        const role = roleMap.get(mapping.roleName);
        if (!role) {
            console.warn(`⚠️ Role ${mapping.roleName} not found for mapping!`);
            continue;
        }

        // Find positions closely matching the name
        const positions = await Position.find({
            name: { $regex: new RegExp(mapping.posName, "i") }
        });

        for (const pos of positions) {
            // Add role if not present
            if (!pos.roles || !pos.roles.includes(role._id)) {
                pos.roles = pos.roles || [];
                pos.roles.push(role._id);
                await pos.save();
                console.log(`🔗 Linked Position '${pos.name}' to Role '${role.name}'`);
            }
        }
    }

    console.log("🎉 Roles seeding complete!");
}

seedRoles()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    });
