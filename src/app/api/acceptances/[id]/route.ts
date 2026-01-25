import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { contractId, acceptanceBatch, totalValue, acceptanceValue, cumulativeValue, acceptanceDate } = body;

        const acceptance = await prisma.contractAcceptance.update({
            where: { id },
            data: {
                contractId,
                acceptanceBatch: parseInt(acceptanceBatch),
                totalValue: parseFloat(totalValue),
                acceptanceValue: parseFloat(acceptanceValue),
                cumulativeValue: parseFloat(cumulativeValue),
                acceptanceDate: new Date(acceptanceDate),
            },
        });

        return NextResponse.json(acceptance);
    } catch (error) {
        console.error("Error updating acceptance:", error);
        return NextResponse.json({ error: "Failed to update acceptance" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.contractAcceptance.delete({ where: { id } });
        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error) {
        console.error("Error deleting acceptance:", error);
        return NextResponse.json({ error: "Failed to delete acceptance" }, { status: 500 });
    }
}
