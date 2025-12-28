import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { GlobalDepartment } from "@/lib/models";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, globalHeadId } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Name is required" },
                { status: 400 }
            );
        }

        await dbConnect();

        const newDepartment = await GlobalDepartment.create({
            name,
            departmentHead: globalHeadId ? [globalHeadId] : [],
        });

        return NextResponse.json(
            { message: "Department created successfully", department: newDepartment },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating department:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        await dbConnect();
        const departments = await GlobalDepartment.find({}).populate("departmentHead", "firstName lastName email");
        return NextResponse.json(departments);
    } catch (error) {
        console.error("Error fetching departments:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}
