import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const appendices = await prisma.contractAppendix.findMany({
            orderBy: { createdAt: "desc" },
            include: { contract: { include: { company: true } } },
        });
        return NextResponse.json(appendices);
    } catch (error) {
        console.error("Error fetching appendices:", error);
        return NextResponse.json({ error: "Failed to fetch appendices" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { appendixNumber, contractId, value, signDate, content } = body;

        const appendix = await prisma.contractAppendix.create({
            data: {
                appendixNumber,
                contractId,
                value: parseFloat(value),
                signDate: new Date(signDate),
                content,
            },
            include: { contract: true },
        });

        return NextResponse.json(appendix, { status: 201 });
    } catch (error) {
        console.error("Error creating appendix:", error);
        return NextResponse.json({ error: "Failed to create appendix" }, { status: 500 });
    }
}
