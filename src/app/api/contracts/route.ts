import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { calculateContractStatus, type ContractStatus } from "@/lib/contract-status";

const CONTRACT_PAGE_SIZE = 50;

const contractInclude = {
    company: {
        select: { id: true, name: true },
    },
    appendices: {
        select: { value: true },
    },
    _count: {
        select: { appendices: true, acceptances: true, payments: true, invoices: true },
    },
};

function parsePage(value: string | null) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function withCalculatedStatus<T extends { expiryDate: Date | string; status?: ContractStatus | null }>(contracts: T[]) {
    return contracts.map((contract) => ({
        ...contract,
        status: calculateContractStatus(contract),
    }));
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const hasPagedQuery =
            searchParams.has("page") ||
            searchParams.has("pageSize") ||
            searchParams.has("search");
        const search = (searchParams.get("search") || "").trim();

        if (hasPagedQuery) {
            const requestedPage = parsePage(searchParams.get("page"));
            const where = search
                ? {
                    OR: [
                        { contractNumber: { contains: search, mode: "insensitive" as const } },
                        { company: { name: { contains: search, mode: "insensitive" as const } } },
                    ],
                }
                : undefined;

            const total = await prisma.contract.count({ where });
            const totalPages = Math.max(1, Math.ceil(total / CONTRACT_PAGE_SIZE));
            const page = Math.min(requestedPage, totalPages);

            const contracts = await prisma.contract.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * CONTRACT_PAGE_SIZE,
                take: CONTRACT_PAGE_SIZE,
                include: contractInclude,
            });

            return NextResponse.json({
                data: withCalculatedStatus(contracts),
                pagination: {
                    page,
                    pageSize: CONTRACT_PAGE_SIZE,
                    total,
                    totalPages,
                },
            });
        }

        const contracts = await prisma.contract.findMany({
            orderBy: { createdAt: "desc" },
            include: contractInclude,
        });

        return NextResponse.json(withCalculatedStatus(contracts));
    } catch (error) {
        console.error("Error fetching contracts:", error);
        return NextResponse.json({ error: "Failed to fetch contracts" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { contractNumber, companyId, signDate, expiryDate, value, status, priority } = body;

        if (!contractNumber || !companyId || !signDate || !expiryDate || !value) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const parsedExpiryDate = new Date(expiryDate);
        const contractStatus = calculateContractStatus({
            expiryDate: parsedExpiryDate,
            status: status as ContractStatus | undefined,
        });

        const contract = await prisma.contract.create({
            data: {
                contractNumber,
                companyId,
                signDate: new Date(signDate),
                expiryDate: parsedExpiryDate,
                value: parseFloat(value),
                status: contractStatus,
                priority: priority || "NORMAL",
            },
            include: { company: true },
        });

        return NextResponse.json(contract, { status: 201 });
    } catch (error) {
        console.error("Error creating contract:", error);
        return NextResponse.json({ error: "Failed to create contract" }, { status: 500 });
    }
}
