import { NextResponse } from "next/server";
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

export async function GET() {
    try {
        const invoices = await prisma.invoice.findMany({
            orderBy: { createdAt: "desc" },
            include: { contract: { include: { company: true } } },
        });

        // Calculate status dynamically for each invoice
        const invoicesWithStatus = invoices.map((invoice) => ({
            ...invoice,
            status: calculateInvoiceStatus(invoice),
        }));

        return NextResponse.json(invoicesWithStatus);
    } catch (error) {
        console.error("Error fetching invoices:", error);
        return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const formData = await request.formData();

        const invoiceNumber = formData.get("invoiceNumber") as string;
        const contractId = formData.get("contractId") as string;
        const totalAmount = formData.get("totalAmount") as string;
        const issueDate = formData.get("issueDate") as string;
        const dueDate = formData.get("dueDate") as string;
        const pdfFile = formData.get("pdfFile") as File | null;

        // Validate required fields
        if (!invoiceNumber || !contractId || !totalAmount || !issueDate || !dueDate) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        let pdfFilePath: string | null = null;
        let pdfFileName: string | null = null;

        // Handle PDF file upload if provided
        if (pdfFile && pdfFile.size > 0) {
            // Validate file type
            if (pdfFile.type !== "application/pdf") {
                return NextResponse.json({ error: "Only PDF files are allowed" }, { status: 400 });
            }

            // Validate file size (10MB max)
            const maxSize = 10 * 1024 * 1024; // 10MB
            if (pdfFile.size > maxSize) {
                return NextResponse.json({ error: "File size must not exceed 10MB" }, { status: 400 });
            }

            try {
                const { supabaseServer, INVOICE_BUCKET } = await import("@/lib/supabase");

                // Generate unique filename
                const timestamp = Date.now();
                const sanitizedName = pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
                const uniqueFileName = `${timestamp}-${sanitizedName}`;
                const filePath = `invoices/${uniqueFileName}`;

                // Convert File to Buffer for upload
                const arrayBuffer = await pdfFile.arrayBuffer();
                const buffer = Buffer.from(arrayBuffer);

                // Upload to Supabase Storage
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

        // Create invoice in database
        const invoice = await prisma.invoice.create({
            data: {
                invoiceNumber,
                contractId,
                totalAmount: parseFloat(totalAmount),
                issueDate: new Date(issueDate),
                dueDate: new Date(dueDate),
                pdfFilePath,
                pdfFileName,
            },
            include: { contract: true },
        });

        return NextResponse.json({
            ...invoice,
            status: calculateInvoiceStatus(invoice),
        }, { status: 201 });
    } catch (error) {
        console.error("Error creating invoice:", error);
        return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
    }
}

