import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const company = await prisma.company.findUnique({
            where: { id },
            include: {
                contracts: true,
            },
        });

        if (!company) {
            return NextResponse.json(
                { error: "Company not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(company);
    } catch (error) {
        console.error("Error fetching company:", error);
        return NextResponse.json(
            { error: "Failed to fetch company" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { name, address, taxCode, contactName, phone } = body;

        const company = await prisma.company.update({
            where: { id },
            data: {
                name,
                address,
                taxCode,
                contactName,
                phone,
            },
        });

        return NextResponse.json(company);
    } catch (error) {
        console.error("Error updating company:", error);
        return NextResponse.json(
            { error: "Failed to update company" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        await prisma.company.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Company deleted successfully" });
    } catch (error) {
        console.error("Error deleting company:", error);
        return NextResponse.json(
            { error: "Failed to delete company" },
            { status: 500 }
        );
    }
}
