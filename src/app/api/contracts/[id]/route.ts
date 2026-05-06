import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateContractStatus, type ContractStatus } from "@/lib/contract-status";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const contract = await prisma.contract.findUnique({
            where: { id },
            include: {
                company: true,
                appendices: true,
                acceptances: true,
                payments: true,
                invoices: true,
            },
        });

        if (!contract) {
            return NextResponse.json({ error: "Contract not found" }, { status: 404 });
        }

        return NextResponse.json({
            ...contract,
            status: calculateContractStatus(contract),
        });
    } catch (error) {
        console.error("Error fetching contract:", error);
        return NextResponse.json({ error: "Failed to fetch contract" }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { contractNumber, companyId, signDate, expiryDate, value, status, priority } = body;

        const parsedExpiryDate = new Date(expiryDate);
        const contractStatus = calculateContractStatus({
            expiryDate: parsedExpiryDate,
            status: status as ContractStatus | undefined,
        });

        const contract = await prisma.contract.update({
            where: { id },
            data: {
                contractNumber,
                companyId,
                signDate: new Date(signDate),
                expiryDate: parsedExpiryDate,
                value: parseFloat(value),
                status: contractStatus,
                priority,
            },
            include: { company: true },
        });

        return NextResponse.json(contract);
    } catch (error) {
        console.error("Error updating contract:", error);
        return NextResponse.json({ error: "Failed to update contract" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.contract.delete({ where: { id } });
        return NextResponse.json({ message: "Contract deleted successfully" });
    } catch (error) {
        console.error("Error deleting contract:", error);
        return NextResponse.json({ error: "Failed to delete contract" }, { status: 500 });
    }
}
