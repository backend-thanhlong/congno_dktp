import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// Helper function to calculate invoice status dynamically
function calculateInvoiceStatus(invoice: { approvedAt: Date | null; dueDate: Date }): "PENDING" | "PAID" | "OVERDUE" {
    if (invoice.approvedAt) {
        return "PAID";
    }
    const now = new Date();
    if (now > invoice.dueDate) {
        return "OVERDUE";
    }
    return "PENDING";
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Check authentication and authorization
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userRole = (session.user as { role?: string })?.role;
        if (userRole !== "KE_TOAN") {
            return NextResponse.json({ error: "Only accountants can approve invoices" }, { status: 403 });
        }

        const { id } = await params;
        const body = await request.json();
        const { paidAmount, paymentDate } = body;

        // Validate required fields
        if (!paidAmount || !paymentDate) {
            return NextResponse.json({ error: "Payment amount and date are required" }, { status: 400 });
        }

        // Get the invoice to validate payment amount
        const invoice = await prisma.invoice.findUnique({
            where: { id },
        });

        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        // Validate that paid amount equals total amount
        const paidAmountNum = parseFloat(paidAmount);
        const totalAmountNum = parseFloat(invoice.totalAmount.toString());

        if (paidAmountNum !== totalAmountNum) {
            return NextResponse.json({
                error: `Số tiền thanh toán phải bằng tổng tiền hóa đơn (${totalAmountNum.toLocaleString('vi-VN')} VND)`
            }, { status: 400 });
        }

        // Get user ID from session
        const username = (session.user as { username?: string })?.username;
        const user = await prisma.user.findUnique({
            where: { username: username || "" },
        });

        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // Update invoice with approval information
        const updatedInvoice = await prisma.invoice.update({
            where: { id },
            data: {
                approvedAt: new Date(),
                approvedByUserId: user.id,
                paidAmount: paidAmountNum,
                paymentDate: new Date(paymentDate),
            },
            include: { contract: true }
        });

        return NextResponse.json({
            ...updatedInvoice,
            status: calculateInvoiceStatus(updatedInvoice),
        });
    } catch (error) {
        console.error("Error approving invoice:", error);
        return NextResponse.json({ error: "Failed to approve invoice" }, { status: 500 });
    }
}

