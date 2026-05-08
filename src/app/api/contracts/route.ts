import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { calculateContractStatus, type ContractStatus } from "@/lib/contract-status";

const CONTRACT_PAGE_SIZE = 50;
const FILTER_QUERY_PARAMS = [
    "companyIds",
    "statuses",
    "priorities",
    "signDateFrom",
    "signDateTo",
    "expiryDateFrom",
    "expiryDateTo",
    "expiringInDays",
    "goodsCategoryPresence",
    "goodsCategoryTypes",
    "appendixPresence",
    "acceptancePresence",
    "paymentPresence",
    "invoicePresence",
];
const STATUS_VALUES = ["ACTIVE", "EXPIRED", "TERMINATED"] as const;
const PRIORITY_VALUES = ["HIGH", "NORMAL", "LOW"] as const;
const GOODS_CATEGORY_VALUES = ["MEDICINE", "SUPPLY"] as const;
const PRESENCE_VALUES = ["HAS", "NONE"] as const;
const EXPIRING_IN_DAYS_VALUES = ["30", "60", "90"] as const;

const contractInclude = {
    company: {
        select: { id: true, name: true },
    },
    appendices: {
        select: { value: true },
    },
    goodsCategory: {
        select: {
            _count: {
                select: { medicines: true, supplies: true },
            },
        },
    },
    _count: {
        select: { appendices: true, acceptances: true, payments: true, invoices: true },
    },
};

function parsePage(value: string | null) {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : 1;
}

function parseCsvParam<T extends string>(
    searchParams: URLSearchParams,
    key: string,
    allowedValues?: readonly T[]
) {
    const allowed = allowedValues ? new Set<string>(allowedValues) : null;
    const values = (searchParams.get(key) || "")
        .split(",")
        .map((value) => value.trim())
        .filter((value): value is T => Boolean(value) && (!allowed || allowed.has(value)));

    return Array.from(new Set(values));
}

function parseDateKey(value: string | null) {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;

    const [year, month, day] = value.split("-").map(Number);
    if (!year || !month || !day) return null;

    return { year, month, day };
}

function startOfHoChiMinhDay(value: string | null) {
    const dateKey = parseDateKey(value);
    if (!dateKey) return null;

    return new Date(Date.UTC(dateKey.year, dateKey.month - 1, dateKey.day, -7, 0, 0, 0));
}

function endOfHoChiMinhDay(value: string | null) {
    const dateKey = parseDateKey(value);
    if (!dateKey) return null;

    return new Date(Date.UTC(dateKey.year, dateKey.month - 1, dateKey.day, 16, 59, 59, 999));
}

function getHoChiMinhDateKey(date: Date) {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Ho_Chi_Minh",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);
    const year = parts.find((part) => part.type === "year")?.value;
    const month = parts.find((part) => part.type === "month")?.value;
    const day = parts.find((part) => part.type === "day")?.value;

    return `${year}-${month}-${day}`;
}

function addDaysToDateKey(dateKey: string, days: number) {
    const parsed = parseDateKey(dateKey);
    if (!parsed) return null;

    const date = new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day + days));
    return date.toISOString().slice(0, 10);
}

function buildDateRangeFilter(from: Date | null, to: Date | null) {
    if (!from && !to) return null;

    return {
        ...(from ? { gte: from } : {}),
        ...(to ? { lte: to } : {}),
    };
}

function buildStatusFilter(statuses: ContractStatus[], todayStart: Date) {
    if (statuses.length === 0 || statuses.length === STATUS_VALUES.length) return null;

    const statusConditions: Prisma.ContractWhereInput[] = [];

    if (statuses.includes("TERMINATED")) {
        statusConditions.push({ status: "TERMINATED" });
    }

    if (statuses.includes("ACTIVE")) {
        statusConditions.push({
            AND: [
                { status: { not: "TERMINATED" } },
                { expiryDate: { gte: todayStart } },
            ],
        });
    }

    if (statuses.includes("EXPIRED")) {
        statusConditions.push({
            AND: [
                { status: { not: "TERMINATED" } },
                { expiryDate: { lt: todayStart } },
            ],
        });
    }

    return statusConditions.length > 0 ? { OR: statusConditions } : null;
}

function buildPresenceFilter(
    values: (typeof PRESENCE_VALUES)[number][],
    hasCondition: Prisma.ContractWhereInput,
    noneCondition: Prisma.ContractWhereInput
) {
    if (values.length !== 1) return null;

    return values[0] === "HAS" ? hasCondition : noneCondition;
}

function buildContractWhere(searchParams: URLSearchParams) {
    const search = (searchParams.get("search") || "").trim();
    const todayKey = getHoChiMinhDateKey(new Date());
    const todayStart = startOfHoChiMinhDay(todayKey) || new Date();
    const andConditions: Prisma.ContractWhereInput[] = [];

    if (search) {
        andConditions.push({
            OR: [
                { contractNumber: { contains: search, mode: "insensitive" } },
                { company: { name: { contains: search, mode: "insensitive" } } },
            ],
        });
    }

    const companyIds = parseCsvParam(searchParams, "companyIds");
    if (companyIds.length > 0) {
        andConditions.push({ companyId: { in: companyIds } });
    }

    const statuses = parseCsvParam(searchParams, "statuses", STATUS_VALUES);
    const statusFilter = buildStatusFilter(statuses, todayStart);
    if (statusFilter) {
        andConditions.push(statusFilter);
    }

    const priorities = parseCsvParam(searchParams, "priorities", PRIORITY_VALUES);
    if (priorities.length > 0 && priorities.length < PRIORITY_VALUES.length) {
        andConditions.push({ priority: { in: priorities } });
    }

    const signDateFilter = buildDateRangeFilter(
        startOfHoChiMinhDay(searchParams.get("signDateFrom")),
        endOfHoChiMinhDay(searchParams.get("signDateTo"))
    );
    if (signDateFilter) {
        andConditions.push({ signDate: signDateFilter });
    }

    const expiryDateFilter = buildDateRangeFilter(
        startOfHoChiMinhDay(searchParams.get("expiryDateFrom")),
        endOfHoChiMinhDay(searchParams.get("expiryDateTo"))
    );
    if (expiryDateFilter) {
        andConditions.push({ expiryDate: expiryDateFilter });
    }

    const expiringInDays = parseCsvParam(searchParams, "expiringInDays", EXPIRING_IN_DAYS_VALUES)[0];
    if (expiringInDays) {
        const expiryEndKey = addDaysToDateKey(todayKey, Number(expiringInDays));
        const expiryEnd = expiryEndKey ? endOfHoChiMinhDay(expiryEndKey) : null;

        if (expiryEnd) {
            andConditions.push({
                status: { not: "TERMINATED" },
                expiryDate: { gte: todayStart, lte: expiryEnd },
            });
        }
    }

    const goodsCategoryPresence = parseCsvParam(searchParams, "goodsCategoryPresence", PRESENCE_VALUES);
    const goodsPresenceFilter = buildPresenceFilter(
        goodsCategoryPresence,
        { goodsCategory: { isNot: null } },
        { goodsCategory: { is: null } }
    );
    if (goodsPresenceFilter) {
        andConditions.push(goodsPresenceFilter);
    }

    const goodsCategoryTypes = parseCsvParam(searchParams, "goodsCategoryTypes", GOODS_CATEGORY_VALUES);
    if (
        goodsCategoryTypes.length > 0 &&
        !(goodsCategoryPresence.length === 1 && goodsCategoryPresence[0] === "NONE")
    ) {
        andConditions.push({ goodsCategory: { is: { type: { in: goodsCategoryTypes } } } });
    }

    const appendixPresence = buildPresenceFilter(
        parseCsvParam(searchParams, "appendixPresence", PRESENCE_VALUES),
        { appendices: { some: {} } },
        { appendices: { none: {} } }
    );
    if (appendixPresence) andConditions.push(appendixPresence);

    const acceptancePresence = buildPresenceFilter(
        parseCsvParam(searchParams, "acceptancePresence", PRESENCE_VALUES),
        { acceptances: { some: {} } },
        { acceptances: { none: {} } }
    );
    if (acceptancePresence) andConditions.push(acceptancePresence);

    const paymentPresence = buildPresenceFilter(
        parseCsvParam(searchParams, "paymentPresence", PRESENCE_VALUES),
        { payments: { some: {} } },
        { payments: { none: {} } }
    );
    if (paymentPresence) andConditions.push(paymentPresence);

    const invoicePresence = buildPresenceFilter(
        parseCsvParam(searchParams, "invoicePresence", PRESENCE_VALUES),
        { invoices: { some: {} } },
        { invoices: { none: {} } }
    );
    if (invoicePresence) andConditions.push(invoicePresence);

    return andConditions.length > 0 ? { AND: andConditions } : undefined;
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
            searchParams.has("search") ||
            FILTER_QUERY_PARAMS.some((param) => searchParams.has(param));

        if (hasPagedQuery) {
            const requestedPage = parsePage(searchParams.get("page"));
            const where = buildContractWhere(searchParams);

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
