import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { User, Employee } from "@/lib/models";
import bcrypt from "bcryptjs";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    // 1. Auth Check
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Permission Check (Only Admin/HR/Owner/Tech)
    await dbConnect();
    const currentUser = await Employee.findById((session.user as any).id).select("roles");
    const allowedRoles = ["admin", "hr", "owner", "tech", "super_user"];
    const hasPermission = currentUser?.roles?.some((r: string) => allowedRoles.includes(r));

    if (!hasPermission) {
        return NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 });
    }

    try {
        const body = await req.json();
        const {
            name,
            email,
            password,
            contactDetails,
            nif,
            address,
            bankDetails,
            dateOfBirth
        } = body;

        if (!name || !email || !password) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        await dbConnect();

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return NextResponse.json(
                { error: "User already exists" },
                { status: 400 }
            );
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            contactDetails: contactDetails || [],
            nif,
            address,
            bankDetails,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            isActive: true
        });

        return NextResponse.json(
            { message: "User created successfully", user: newUser },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating user:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Allow Managers to see users but ideally scoped? For now, global list is restricted to higher roles in many systems.
    // User requested "Explicit permission checks".
    // Let's restrict global user list to Management.

    await dbConnect();
    const currentUser = await Employee.findById((session.user as any).id);
    // Expand to include store managers for directory purposes?
    // Usually a raw /api/users dump implies administrative access. 
    // Directory is usually handled via specific search API or scoped endpoint.
    // Let's stick to Admin/HR/Tech/Owner/StoreManager for now.

    const allowedRoles = ["admin", "hr", "owner", "tech", "super_user", "store_manager", "manager"];
    const hasPermission = currentUser?.roles?.some((r: string) => allowedRoles.includes(r));

    if (!hasPermission) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
        await dbConnect();
        const users = await User.find({})
            .select("-password")
            .populate("positions");
        return NextResponse.json(users);
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
