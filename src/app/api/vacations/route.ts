import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import { VacationRequest, Employee } from "@/lib/models";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { startDate, endDate, reason } = body;

        if (!startDate || !endDate) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        await dbConnect();

        const requestedFrom = new Date(startDate);
        const requestedTo = new Date(endDate);
        const diffTime = Math.abs(requestedTo.getTime() - requestedFrom.getTime());
        const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const newVacation = await VacationRequest.create({
            employeeId: (session.user as any).id,
            requestedFrom,
            requestedTo,
            totalDays,
            comments: reason,
            status: "pending",
        });

        return NextResponse.json(
            { message: "Request submitted successfully", vacation: newVacation },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating vacation request:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();

        // If admin/hr, show all. If employee, show only theirs.
        const roles = (session.user as any).roles || [];
        let query = {};
        if (!roles.includes("admin") && !roles.includes("hr")) {
            query = { employeeId: (session.user as any).id };
        }

        const vacations = await VacationRequest.find(query).populate("employeeId", "firstName lastName email");
        return NextResponse.json(vacations);
    } catch (error) {
        console.error("Error fetching vacations:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
}

export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        // Add role check here

        const body = await req.json();
        const { id, status } = body;

        await dbConnect();
        const vacation = await VacationRequest.findByIdAndUpdate(id, { status }, { new: true });

        return NextResponse.json(vacation);
    } catch (error) {
        return NextResponse.json({ error: "Error" }, { status: 500 });
    }
}
