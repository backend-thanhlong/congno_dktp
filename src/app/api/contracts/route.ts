import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const contracts = await prisma.contract.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                company: {
                    select: { id: true, name: true },
                },
                appendices: {
                    select: { value: true },
                },
                _count: {
                    select: { appendices: true, acceptances: true, payments: true, invoices: true },
                },
            },
        });
        return NextResponse.json(contracts);
    } catch (error) {
        console.error("Error fetching contracts:", error);
        return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { contractNumber, companyId, signDate, expiryDate, value, status, priority } = body;

        if (!contractNumber || !companyId || !signDate || !expiryDate || !value) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const contract = await prisma.contract.create({
            data: {
                contractNumber,
                companyId,
                signDate: new Date(signDate),
                expiryDate: new Date(expiryDate),
                value: parseFloat(value),
                status: status || "ACTIVE",
                priority: priority || "NORMAL",
            },
            include: { company: true },
        });

        return NextResponse.json(contract, { status: 201 });
    } catch (error) {
        console.error("Error creating contract:", error);
        return NextResponse.json({ error: "Failed to create contract" }, { status: 500 });
    }
}
