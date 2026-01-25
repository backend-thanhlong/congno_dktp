import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
    try {
        const session = await auth();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

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
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

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
            const month = new Date(payment.paymentDate).toLocaleDateString("vi-VN", {
                year: "numeric",
                month: "2-digit",
            });
            if (!monthlyTrends[month]) {
                monthlyTrends[month] = 0;
            }
            monthlyTrends[month] += Number(payment.requestedAmount);
        });

        const paymentTrends = Object.entries(monthlyTrends)
            .map(([month, amount]) => ({
                month,
                amount,
            }))
            .sort((a, b) => {
                const [monthA, yearA] = a.month.split("/");
                const [monthB, yearB] = b.month.split("/");
                return new Date(`${yearA}-${monthA}`).getTime() - new Date(`${yearB}-${monthB}`).getTime();
            });

        // Top companies by contract count
        const topCompanies = await prisma.company.findMany({
            select: {
                id: true,
                name: true,
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
        }));

        return NextResponse.json({
            contractDistribution,
            invoiceDistribution,
            priorityDistribution,
            paymentTrends,
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
