import { NextResponse } from "next/server";

export async function POST(req: Request) {
    return NextResponse.json(
        { error: "API deprecated. Use /src/lib/actions/employee.actions.ts" },
        { status: 501 }
    );
}

export async function GET(req: Request) {
    return NextResponse.json(
        { error: "API deprecated." },
        { status: 501 }
    );
}
