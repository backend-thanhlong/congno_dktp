import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { appendixNumber, contractId, value, signDate, content } = body;

        const appendix = await prisma.contractAppendix.update({
            where: { id },
            data: { appendixNumber, contractId, value: parseFloat(value), signDate: new Date(signDate), content },
        });

        return NextResponse.json(appendix);
    } catch (error) {
        console.error("Error updating appendix:", error);
        return NextResponse.json({ error: "Failed to update appendix" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.contractAppendix.delete({ where: { id } });
        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error) {
        console.error("Error deleting appendix:", error);
        return NextResponse.json({ error: "Failed to delete appendix" }, { status: 500 });
    }
}
