import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
    try {
        const companies = await prisma.company.findMany({
            orderBy: { createdAt: "desc" },
            include: {
                _count: {
                    select: { contracts: true },
                },
            },
        });
        return NextResponse.json(companies);
    } catch (error) {
        console.error("Error fetching companies:", error);
        return NextResponse.json(
            { error: "Failed to fetch companies" },
            { status: 500 }
        );
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, address, taxCode, contactName, phone } = body;

        if (!name) {
            return NextResponse.json(
                { error: "Tên công ty là bắt buộc" },
                { status: 400 }
            );
        }

        const company = await prisma.company.create({
            data: {
                name,
                address,
                taxCode,
                contactName,
                phone,
            },
        });

        return NextResponse.json(company, { status: 201 });
    } catch (error) {
        console.error("Error creating company:", error);
        return NextResponse.json(
            { error: "Failed to create company" },
            { status: 500 }
        );
    }
}
