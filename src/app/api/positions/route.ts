import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Position, User, Role } from "@/lib/models";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, roleId, entityId, startDate, assignedById } = body;

        if (!userId || !roleId || !entityId) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        await dbConnect();

        const newPosition = await Position.create({
            user: userId,
            role: roleId,
            entityId,
            startDate: startDate ? new Date(startDate) : new Date(),
            assignedBy: assignedById,
        });

        // Update user's positions array
        await User.findByIdAndUpdate(userId, {
            $push: { positions: newPosition._id }
        });

        return NextResponse.json(
            { message: "Position assigned successfully", position: newPosition },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error assigning position:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
