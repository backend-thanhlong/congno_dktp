import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const acceptances = await prisma.contractAcceptance.findMany({
            orderBy: { createdAt: "desc" },
            include: { contract: { include: { company: true } } },
        });
        return NextResponse.json(acceptances);
    } catch (error) {
        console.error("Error fetching acceptances:", error);
        return NextResponse.json({ error: "Failed to fetch acceptances" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { contractId, acceptanceBatch, totalValue, acceptanceValue, cumulativeValue, acceptanceDate } = body;

        const acceptance = await prisma.contractAcceptance.create({
            data: {
                contractId,
                acceptanceBatch: parseInt(acceptanceBatch),
                totalValue: parseFloat(totalValue),
                acceptanceValue: parseFloat(acceptanceValue),
                cumulativeValue: parseFloat(cumulativeValue),
                acceptanceDate: new Date(acceptanceDate),
            },
            include: { contract: true },
        });

        return NextResponse.json(acceptance, { status: 201 });
    } catch (error) {
        console.error("Error creating acceptance:", error);
        return NextResponse.json({ error: "Failed to create acceptance" }, { status: 500 });
    }
}
