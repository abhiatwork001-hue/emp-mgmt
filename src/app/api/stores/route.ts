import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Store } from "@/lib/models";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, location, managerId } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }

        await dbConnect();

        const newStore = await Store.create({
            name,
            location,
            manager: managerId,
        });

        return NextResponse.json(
            { message: "Store created successfully", store: newStore },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating store:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        await dbConnect();
        const stores = await Store.find({}).populate("manager", "name email");
        return NextResponse.json(stores);
    } catch (error) {
        console.error("Error fetching stores:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
