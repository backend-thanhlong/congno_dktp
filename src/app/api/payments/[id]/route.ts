import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const {
            contractId, paymentNumber, invoiceId,
            prevCumulativeComplete, prevAdvancePayment, prevDirectPayment, prevAdvanceBalance,
            requestedAmount, advancePayment, directPayment, paymentDate
        } = body;

        const payment = await prisma.contractPayment.update({
            where: { id },
            data: {
                contractId,
                paymentNumber,
                invoiceId: invoiceId || null,
                prevCumulativeComplete: parseFloat(prevCumulativeComplete || 0),
                prevAdvancePayment: parseFloat(prevAdvancePayment || 0),
                prevDirectPayment: parseFloat(prevDirectPayment || 0),
                prevAdvanceBalance: parseFloat(prevAdvanceBalance || 0),
                requestedAmount: parseFloat(requestedAmount),
                advancePayment: parseFloat(advancePayment || 0),
                directPayment: parseFloat(directPayment || 0),
                paymentDate: new Date(paymentDate),
            },
        });

        return NextResponse.json(payment);
    } catch (error) {
        console.error("Error updating payment:", error);
        return NextResponse.json({ error: "Failed to update payment" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.contractPayment.delete({ where: { id } });
        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error) {
        console.error("Error deleting payment:", error);
        return NextResponse.json({ error: "Failed to delete payment" }, { status: 500 });
    }
}
