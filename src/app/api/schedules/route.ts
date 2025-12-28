import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { Schedule } from "@/lib/models";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { storeDepartmentId, date, shifts } = body;

        if (!storeDepartmentId || !date || !shifts) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        await dbConnect();

        // Check if schedule exists for this date and department
        const existingSchedule = await Schedule.findOne({
            storeDepartment: storeDepartmentId,
            date: new Date(date),
        });

        if (existingSchedule) {
            existingSchedule.shifts = shifts;
            await existingSchedule.save();
            return NextResponse.json(
                { message: "Schedule updated successfully", schedule: existingSchedule },
                { status: 200 }
            );
        }

        const newSchedule = await Schedule.create({
            storeDepartment: storeDepartmentId,
            date: new Date(date),
            shifts,
        });

        return NextResponse.json(
            { message: "Schedule created successfully", schedule: newSchedule },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating schedule:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const storeDepartmentId = searchParams.get("storeDepartmentId");
    const date = searchParams.get("date");

    if (!storeDepartmentId || !date) {
        return NextResponse.json(
            { error: "Missing query params" },
            { status: 400 }
        );
    }

    try {
        await dbConnect();
        const schedule = await Schedule.findOne({
            storeDepartment: storeDepartmentId,
            date: new Date(date),
        }).populate("shifts.user", "name");

        return NextResponse.json(schedule || { shifts: [] });
    } catch (error) {
        console.error("Error fetching schedule:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
