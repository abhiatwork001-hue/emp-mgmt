import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Position } from "@/lib/models";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, permissions } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }

        await dbConnect();

        const newPosition = await Position.create({
            name,
            permissions: permissions || [],
        });

        return NextResponse.json(
            { message: "Role created successfully", role: newPosition },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating role:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        await dbConnect();
        const roles = await Position.find({});
        return NextResponse.json(roles);
    } catch (error) {
        console.error("Error fetching roles:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
