import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
    try {
        const session = await auth();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formatMonthKey = (date: Date) => (
            date.toLocaleDateString("vi-VN", {
                year: "numeric",
                month: "2-digit",
            })
        );

        const lastSixMonths = Array.from({ length: 6 }, (_, index) => {
            const date = new Date();
            date.setMonth(date.getMonth() - (5 - index));
            date.setDate(1);

            return {
                key: formatMonthKey(date),
                start: new Date(date.getFullYear(), date.getMonth(), 1),
                end: new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999),
            };
        });

        // Contract status distribution
        const contractStats = await prisma.contract.groupBy({
            by: ["status"],
            _count: {
                status: true,
            },
        });

        const contractDistribution = contractStats.map((stat) => ({
            status: stat.status,
            count: stat._count.status,
        }));

        // Invoice status distribution
        const invoiceStats = await prisma.invoice.groupBy({
            by: ["status"],
            _count: {
                status: true,
            },
        });

        const invoiceDistribution = invoiceStats.map((stat) => ({
            status: stat.status,
            count: stat._count.status,
        }));

        // Contract priority distribution
        const priorityStats = await prisma.contract.groupBy({
            by: ["priority"],
            _count: {
                priority: true,
            },
        });

        const priorityDistribution = priorityStats.map((stat) => ({
            priority: stat.priority,
            count: stat._count.priority,
        }));

        // Monthly payment trends (last 6 months)
        const sixMonthsAgo = lastSixMonths[0].start;

        const payments = await prisma.contractPayment.findMany({
            where: {
                paymentDate: {
                    gte: sixMonthsAgo,
                },
            },
            select: {
                paymentDate: true,
                requestedAmount: true,
            },
        });

        // Group by month
        const monthlyTrends: { [key: string]: number } = {};
        payments.forEach((payment) => {
            const month = formatMonthKey(new Date(payment.paymentDate));
            if (!monthlyTrends[month]) {
                monthlyTrends[month] = 0;
            }
            monthlyTrends[month] += Number(payment.requestedAmount);
        });

        const paymentTrends = lastSixMonths.map((month) => ({
            month: month.key,
            amount: monthlyTrends[month.key] || 0,
        }));

        const contracts = await prisma.contract.findMany({
            where: {
                createdAt: {
                    gte: sixMonthsAgo,
                },
            },
            select: {
                createdAt: true,
                value: true,
            },
        });

        const monthlyContracts: { [key: string]: { count: number; value: number } } = {};
        contracts.forEach((contract) => {
            const month = formatMonthKey(new Date(contract.createdAt));
            if (!monthlyContracts[month]) {
                monthlyContracts[month] = { count: 0, value: 0 };
            }
            monthlyContracts[month].count += 1;
            monthlyContracts[month].value += Number(contract.value);
        });

        const contractTrends = lastSixMonths.map((month) => ({
            month: month.key,
            count: monthlyContracts[month.key]?.count || 0,
            value: monthlyContracts[month.key]?.value || 0,
        }));

        // Top companies by contract count
        const topCompanies = await prisma.company.findMany({
            select: {
                id: true,
                name: true,
                contracts: {
                    select: {
                        value: true,
                    },
                },
                _count: {
                    select: {
                        contracts: true,
                    },
                },
            },
            orderBy: {
                contracts: {
                    _count: "desc",
                },
            },
            take: 5,
        });

        const companyRanking = topCompanies.map((company) => ({
            name: company.name,
            contractCount: company._count.contracts,
            totalValue: company.contracts
                .reduce((sum, contract) => sum + Number(contract.value), 0),
        }));

        return NextResponse.json({
            contractDistribution,
            invoiceDistribution,
            priorityDistribution,
            paymentTrends,
            contractTrends,
            topCompanies: companyRanking,
        });
    } catch (error) {
        console.error("Error fetching analytics:", error);
        return NextResponse.json(
            { error: "Failed to fetch analytics" },
            { status: 500 }
        );
    }
}
