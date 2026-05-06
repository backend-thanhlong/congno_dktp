import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

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

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const formData = await request.formData();

        const invoiceNumber = formData.get("invoiceNumber") as string;
        const contractId = formData.get("contractId") as string;
        const totalAmount = formData.get("totalAmount") as string;
        const issueDate = formData.get("issueDate") as string;
        const dueDate = formData.get("dueDate") as string;
        const pdfFile = formData.get("pdfFile") as File | null;
        const removePdf = formData.get("removePdf") === "true";

        // Get current invoice to check for existing PDF
        const currentInvoice = await prisma.invoice.findUnique({
            where: { id },
            select: { pdfFilePath: true }
        });

        if (!currentInvoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        let pdfFilePath: string | null | undefined = undefined;
        let pdfFileName: string | null | undefined = undefined;

        // Handle PDF removal
        if (removePdf && currentInvoice.pdfFilePath) {
            try {
                const { supabaseServer, INVOICE_BUCKET } = await import("@/lib/supabase");
                await supabaseServer.storage
                    .from(INVOICE_BUCKET)
                    .remove([currentInvoice.pdfFilePath]);

                pdfFilePath = null;
                pdfFileName = null;
            } catch (err) {
                console.error("Error removing old PDF:", err);
            }
        }
        // Handle PDF replacement
        else if (pdfFile && pdfFile.size > 0) {
            // Validate file type
            if (pdfFile.type !== "application/pdf") {
                return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
            }

            // Validate file size (10MB max)
            const maxSize = 10 * 1024 * 1024;
            if (pdfFile.size > maxSize) {
                return NextResponse.json({ error: "File size must not exceed 10MB" }, { status: 400 });
            }

            try {
                const { supabaseServer, INVOICE_BUCKET } = await import("@/lib/supabase");

                // Delete old file if exists
                if (currentInvoice.pdfFilePath) {
                    await supabaseServer.storage
                        .from(INVOICE_BUCKET)
                        .remove([currentInvoice.pdfFilePath]);
                }

                // Upload new file
                const timestamp = Date.now();
                const sanitizedName = pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const uniqueFileName = `${timestamp}-${sanitizedName}`;
                const filePath = `invoices/${uniqueFileName}`;

                const arrayBuffer = await pdfFile.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                const { error: uploadError } = await supabaseServer.storage
                    .from(INVOICE_BUCKET)
                    .upload(filePath, buffer, {
                        contentType: pdfFile.type,
                        upsert: false
                    });

                if (uploadError) {
                    console.error("Supabase upload error:", uploadError);
                    return NextResponse.json({ error: "Failed to upload PDF file" }, { status: 500 });
                }

                pdfFilePath = filePath;
                pdfFileName = pdfFile.name;
            } catch (uploadErr) {
                console.error("Error during file upload:", uploadErr);
                return NextResponse.json({ error: "Failed to process PDF file" }, { status: 500 });
            }
        }

        // Build update data
        const updateData: Prisma.InvoiceUncheckedUpdateInput = {
            invoiceNumber,
            contractId,
            totalAmount: parseFloat(totalAmount),
            issueDate: new Date(issueDate),
            dueDate: new Date(dueDate),
        };

        // Only update PDF fields if they were modified
        if (pdfFilePath !== undefined) {
            updateData.pdfFilePath = pdfFilePath;
        }
        if (pdfFileName !== undefined) {
            updateData.pdfFileName = pdfFileName;
        }

        const invoice = await prisma.invoice.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json({
            ...invoice,
            status: calculateInvoiceStatus(invoice),
        });
    } catch (error) {
        console.error("Error updating invoice:", error);
        return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // Get invoice to check for PDF file
        const invoice = await prisma.invoice.findUnique({
            where: { id },
            select: { pdfFilePath: true }
        });

        if (!invoice) {
            return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
        }

        // Delete PDF file from storage if exists
        if (invoice.pdfFilePath) {
            try {
                const { supabaseServer, INVOICE_BUCKET } = await import("@/lib/supabase");
                await supabaseServer.storage
                    .from(INVOICE_BUCKET)
                    .remove([invoice.pdfFilePath]);
            } catch (err) {
                console.error("Error deleting PDF from storage:", err);
                // Continue with deletion even if file cleanup fails
            }
        }

        // Delete invoice from database
        await prisma.invoice.delete({ where: { id } });
        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error) {
        console.error("Error deleting invoice:", error);
        return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
    }
}
