import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const payments = await prisma.contractPayment.findMany({
            orderBy: { createdAt: "desc" },
            include: { contract: { include: { company: true } }, invoice: true },
        });
        return NextResponse.json(payments);
    } catch (error) {
        console.error("Error fetching payments:", error);
        return NextResponse.json({ error: "Failed to fetch payments" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            contractId, paymentNumber, invoiceId,
            prevCumulativeComplete, prevAdvancePayment, prevDirectPayment, prevAdvanceBalance,
            requestedAmount, advancePayment, directPayment, paymentDate
        } = body;

        const payment = await prisma.contractPayment.create({
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
            include: { contract: true, invoice: true },
        });

        return NextResponse.json(payment, { status: 201 });
    } catch (error) {
        console.error("Error creating payment:", error);
        return NextResponse.json({ error: "Failed to create payment" }, { status: 500 });
    }
}
