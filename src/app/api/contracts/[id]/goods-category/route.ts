import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

type GoodsCategoryType = "MEDICINE" | "SUPPLY";

type MedicineCreateInput = {
    orderNumber: number;
    drugName: string;
    activeIngredient: string;
    concentration: string;
    dosageForm: string;
    route: string;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
};

type SupplyCreateInput = {
    orderNumber: number;
    goodsName: string;
    technicalRequirement: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
};

const categoryInclude = {
    medicines: {
        orderBy: [
            { orderNumber: "asc" as const },
            { createdAt: "asc" as const },
        ],
    },
    supplies: {
        orderBy: [
            { orderNumber: "asc" as const },
            { createdAt: "asc" as const },
        ],
    },
};

class HttpError extends Error {
    status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBodyRecord(value: unknown) {
    if (!isRecord(value)) {
        throw new HttpError(400, "Invalid request body");
    }

    return value;
}

function readCategoryType(value: unknown): GoodsCategoryType {
    if (value === "MEDICINE" || value === "SUPPLY") {
        return value;
    }

    throw new HttpError(400, "Invalid category type");
}

function readItems(body: Record<string, unknown>) {
    if (body.items === undefined) {
        return [];
    }

    if (!Array.isArray(body.items)) {
        throw new HttpError(400, "Items must be an array");
    }

    return body.items.map((item) => {
        if (!isRecord(item)) {
            throw new HttpError(400, "Each item must be an object");
        }

        return item;
    });
}

function readRequiredString(value: unknown, fieldName: string) {
    if (typeof value !== "string") {
        throw new HttpError(400, `${fieldName} is required`);
    }

    const trimmed = value.trim();
    if (!trimmed) {
        throw new HttpError(400, `${fieldName} is required`);
    }

    return trimmed;
}

function readOptionalString(value: unknown, fieldName: string) {
    if (value === undefined || value === null) {
        return null;
    }

    if (typeof value !== "string") {
        throw new HttpError(400, `${fieldName} must be text`);
    }

    const trimmed = value.trim();
    return trimmed || null;
}

function readOrderNumber(value: unknown, fieldName: string) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new HttpError(400, `${fieldName} must be a positive integer`);
    }

    return parsed;
}

function readNonNegativeNumber(value: unknown, fieldName: string) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
        throw new HttpError(400, `${fieldName} must be a non-negative number`);
    }

    return parsed;
}

function roundMoney(value: number) {
    return Number(value.toFixed(2));
}

function parseMedicineItems(items: Record<string, unknown>[]): MedicineCreateInput[] {
    return items.map((item) => {
        const unitPrice = readNonNegativeNumber(item.unitPrice, "unitPrice");
        const quantity = readNonNegativeNumber(item.quantity, "quantity");

        return {
            orderNumber: readOrderNumber(item.orderNumber, "orderNumber"),
            drugName: readRequiredString(item.drugName, "drugName"),
            activeIngredient: readRequiredString(item.activeIngredient, "activeIngredient"),
            concentration: readRequiredString(item.concentration, "concentration"),
            dosageForm: readRequiredString(item.dosageForm, "dosageForm"),
            route: readRequiredString(item.route, "route"),
            unitPrice,
            quantity,
            lineTotal: roundMoney(unitPrice * quantity),
        };
    });
}

function parseSupplyItems(items: Record<string, unknown>[]): SupplyCreateInput[] {
    return items.map((item) => {
        const unitPrice = readNonNegativeNumber(item.unitPrice, "unitPrice");
        const quantity = readNonNegativeNumber(item.quantity, "quantity");

        return {
            orderNumber: readOrderNumber(item.orderNumber, "orderNumber"),
            goodsName: readRequiredString(item.goodsName, "goodsName"),
            technicalRequirement: readOptionalString(
                item.technicalRequirement,
                "technicalRequirement"
            ),
            quantity,
            unitPrice,
            lineTotal: roundMoney(unitPrice * quantity),
        };
    });
}

async function assertCanEdit() {
    const session = await auth();
    const role = session?.user?.role;

    if (!role) {
        throw new HttpError(401, "Unauthorized");
    }

    if (role !== "ADMIN" && role !== "KHOA_DUOC") {
        throw new HttpError(403, "Forbidden");
    }
}

function errorResponse(error: unknown, fallbackMessage: string) {
    if (error instanceof HttpError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error(fallbackMessage, error);
    return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const contract = await prisma.contract.findUnique({
            where: { id },
            select: {
                id: true,
                goodsCategory: {
                    include: categoryInclude,
                },
            },
        });

        if (!contract) {
            throw new HttpError(404, "Contract not found");
        }

        return NextResponse.json(contract.goodsCategory);
    } catch (error) {
        return errorResponse(error, "Failed to fetch goods category");
    }
}

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await assertCanEdit();

        const { id } = await params;
        const body = readBodyRecord(await request.json());
        const type = readCategoryType(body.type);
        const items = readItems(body);
        const medicineItems = type === "MEDICINE" ? parseMedicineItems(items) : [];
        const supplyItems = type === "SUPPLY" ? parseSupplyItems(items) : [];

        const category = await prisma.$transaction(async (tx) => {
            const contract = await tx.contract.findUnique({
                where: { id },
                select: { id: true },
            });

            if (!contract) {
                throw new HttpError(404, "Contract not found");
            }

            const existingCategory = await tx.contractGoodsCategory.findUnique({
                where: { contractId: id },
                select: { id: true },
            });

            if (existingCategory) {
                throw new HttpError(409, "Goods category already exists");
            }

            return tx.contractGoodsCategory.create({
                data: {
                    contractId: id,
                    type,
                    medicines:
                        type === "MEDICINE" && medicineItems.length > 0
                            ? { create: medicineItems }
                            : undefined,
                    supplies:
                        type === "SUPPLY" && supplyItems.length > 0
                            ? { create: supplyItems }
                            : undefined,
                },
                include: categoryInclude,
            });
        });

        return NextResponse.json(category, { status: 201 });
    } catch (error) {
        return errorResponse(error, "Failed to create goods category");
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await assertCanEdit();

        const { id } = await params;
        const body = readBodyRecord(await request.json());
        const items = readItems(body);

        const category = await prisma.$transaction(async (tx) => {
            const existingCategory = await tx.contractGoodsCategory.findUnique({
                where: { contractId: id },
                select: { id: true, type: true },
            });

            if (!existingCategory) {
                throw new HttpError(404, "Goods category not found");
            }

            if (body.type !== undefined && body.type !== existingCategory.type) {
                throw new HttpError(400, "Category type cannot be changed");
            }

            if (existingCategory.type === "MEDICINE") {
                const medicineItems = parseMedicineItems(items);
                await tx.medicineItem.deleteMany({
                    where: { categoryId: existingCategory.id },
                });

                if (medicineItems.length > 0) {
                    await tx.medicineItem.createMany({
                        data: medicineItems.map((item) => ({
                            ...item,
                            categoryId: existingCategory.id,
                        })),
                    });
                }
            } else {
                const supplyItems = parseSupplyItems(items);
                await tx.supplyItem.deleteMany({
                    where: { categoryId: existingCategory.id },
                });

                if (supplyItems.length > 0) {
                    await tx.supplyItem.createMany({
                        data: supplyItems.map((item) => ({
                            ...item,
                            categoryId: existingCategory.id,
                        })),
                    });
                }
            }

            const updatedCategory = await tx.contractGoodsCategory.findUnique({
                where: { id: existingCategory.id },
                include: categoryInclude,
            });

            if (!updatedCategory) {
                throw new HttpError(404, "Goods category not found");
            }

            return updatedCategory;
        });

        return NextResponse.json(category);
    } catch (error) {
        return errorResponse(error, "Failed to update goods category");
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await assertCanEdit();

        const { id } = await params;
        const existingCategory = await prisma.contractGoodsCategory.findUnique({
            where: { contractId: id },
            select: { id: true },
        });

        if (!existingCategory) {
            throw new HttpError(404, "Goods category not found");
        }

        await prisma.contractGoodsCategory.delete({
            where: { id: existingCategory.id },
        });

        return NextResponse.json({ message: "Goods category deleted successfully" });
    } catch (error) {
        return errorResponse(error, "Failed to delete goods category");
    }
}
