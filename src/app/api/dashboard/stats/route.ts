import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
    try {
        const session = await auth();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Get current date ranges for calculations
        const now = new Date();
        const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Get companies statistics
        const totalCompanies = await prisma.company.count();
        const companiesThisMonth = await prisma.company.count({
            where: {
                createdAt: {
                    gte: firstDayThisMonth,
                },
            },
        });
        const companiesLastMonth = await prisma.company.count({
            where: {
                createdAt: {
                    gte: firstDayLastMonth,
                    lte: lastDayLastMonth,
                },
            },
        });

        // Get contracts statistics
        const totalContracts = await prisma.contract.count();
        const contractsThisMonth = await prisma.contract.count({
            where: {
                createdAt: {
                    gte: firstDayThisMonth,
                },
            },
        });
        const contractsLastMonth = await prisma.contract.count({
            where: {
                createdAt: {
                    gte: firstDayLastMonth,
                    lte: lastDayLastMonth,
                },
            },
        });

        // Get contract status breakdown
        const activeContracts = await prisma.contract.count({
            where: { status: "ACTIVE" },
        });
        const expiredContracts = await prisma.contract.count({
            where: { status: "EXPIRED" },
        });
        const terminatedContracts = await prisma.contract.count({
            where: { status: "TERMINATED" },
        });
        const highPriorityContracts = await prisma.contract.count({
            where: { priority: "HIGH" },
        });
        const expiringSoonDate = new Date(now);
        expiringSoonDate.setDate(expiringSoonDate.getDate() + 30);
        const expiringSoonContracts = await prisma.contract.count({
            where: {
                status: "ACTIVE",
                expiryDate: {
                    gte: now,
                    lte: expiringSoonDate,
                },
            },
        });
        const totalContractValueResult = await prisma.contract.aggregate({
            _sum: {
                value: true,
            },
        });

        // Get invoices statistics
        const totalInvoices = await prisma.invoice.count();
        const invoicesThisMonth = await prisma.invoice.count({
            where: {
                createdAt: {
                    gte: firstDayThisMonth,
                },
            },
        });
        const invoicesLastMonth = await prisma.invoice.count({
            where: {
                createdAt: {
                    gte: firstDayLastMonth,
                    lte: lastDayLastMonth,
                },
            },
        });

        // Get invoice status breakdown
        const pendingInvoices = await prisma.invoice.count({
            where: { status: "PENDING" },
        });
        const paidInvoices = await prisma.invoice.count({
            where: { status: "PAID" },
        });
        const overdueInvoices = await prisma.invoice.count({
            where: { status: "OVERDUE" },
        });
        const totalInvoiceAmountResult = await prisma.invoice.aggregate({
            _sum: {
                totalAmount: true,
            },
        });
        const pendingInvoiceAmountResult = await prisma.invoice.aggregate({
            where: { status: "PENDING" },
            _sum: {
                totalAmount: true,
            },
        });
        const overdueInvoiceAmountResult = await prisma.invoice.aggregate({
            where: { status: "OVERDUE" },
            _sum: {
                totalAmount: true,
            },
        });

        // Get payment statistics
        const totalPaymentsResult = await prisma.contractPayment.aggregate({
            _sum: {
                requestedAmount: true,
            },
        });

        const paymentsThisMonthResult = await prisma.contractPayment.aggregate({
            where: {
                createdAt: {
                    gte: firstDayThisMonth,
                },
            },
            _sum: {
                requestedAmount: true,
            },
        });

        const paymentsLastMonthResult = await prisma.contractPayment.aggregate({
            where: {
                createdAt: {
                    gte: firstDayLastMonth,
                    lte: lastDayLastMonth,
                },
            },
            _sum: {
                requestedAmount: true,
            },
        });

        const totalPayments = totalPaymentsResult._sum.requestedAmount || 0;
        const paymentsThisMonth = paymentsThisMonthResult._sum.requestedAmount || 0;
        const paymentsLastMonth = paymentsLastMonthResult._sum.requestedAmount || 0;
        const totalContractValue = totalContractValueResult._sum.value || 0;
        const totalInvoiceAmount = totalInvoiceAmountResult._sum.totalAmount || 0;
        const pendingInvoiceAmount = pendingInvoiceAmountResult._sum.totalAmount || 0;
        const overdueInvoiceAmount = overdueInvoiceAmountResult._sum.totalAmount || 0;

        // Calculate changes
        const companiesChange = companiesThisMonth - companiesLastMonth;
        const contractsChange = contractsThisMonth - contractsLastMonth;
        const invoicesChange = invoicesThisMonth - invoicesLastMonth;

        const paymentsChangePercent = Number(paymentsLastMonth) > 0
            ? ((Number(paymentsThisMonth) - Number(paymentsLastMonth)) / Number(paymentsLastMonth) * 100)
            : 0;

        return NextResponse.json({
            companies: {
                total: totalCompanies,
                change: companiesChange >= 0 ? `+${companiesChange}` : companiesChange.toString(),
            },
            contracts: {
                total: totalContracts,
                change: contractsChange >= 0 ? `+${contractsChange}` : contractsChange.toString(),
                active: activeContracts,
                expired: expiredContracts,
                terminated: terminatedContracts,
                highPriority: highPriorityContracts,
                expiringSoon: expiringSoonContracts,
                totalValue: totalContractValue.toString(),
            },
            invoices: {
                total: totalInvoices,
                change: invoicesChange >= 0 ? `+${invoicesChange}` : invoicesChange.toString(),
                pending: pendingInvoices,
                paid: paidInvoices,
                overdue: overdueInvoices,
                totalAmount: totalInvoiceAmount.toString(),
                pendingAmount: pendingInvoiceAmount.toString(),
                overdueAmount: overdueInvoiceAmount.toString(),
            },
            payments: {
                total: totalPayments.toString(),
                change: paymentsChangePercent >= 0
                    ? `+${paymentsChangePercent.toFixed(1)}%`
                    : `${paymentsChangePercent.toFixed(1)}%`,
                currentMonth: paymentsThisMonth.toString(),
            },
            risks: {
                expiringSoonContracts,
                overdueInvoices,
                pendingInvoices,
                highPriorityContracts,
            },
        });
    } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        return NextResponse.json(
            { error: "Failed to fetch dashboard statistics" },
            { status: 500 }
        );
    }
}
