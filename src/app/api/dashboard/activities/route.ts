import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET() {
    try {
        const session = await auth();

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch recent activities from different models
        const recentContracts = await prisma.contract.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                contractNumber: true,
                createdAt: true,
                updatedAt: true,
                company: {
                    select: { name: true },
                },
            },
        });

        const recentInvoices = await prisma.invoice.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                invoiceNumber: true,
                createdAt: true,
                approvedAt: true,
                status: true,
                approvedBy: {
                    select: { name: true },
                },
                contract: {
                    select: { contractNumber: true },
                },
            },
        });

        const recentPayments = await prisma.contractPayment.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                paymentNumber: true,
                requestedAmount: true,
                createdAt: true,
                contract: {
                    select: { contractNumber: true },
                },
            },
        });

        const recentCompanies = await prisma.company.findMany({
            orderBy: { createdAt: "desc" },
            take: 5,
            select: {
                id: true,
                name: true,
                createdAt: true,
            },
        });


        // Combine and format activities
        interface Activity {
            id: string;
            action: string;
            time: Date;
            user: string;
            type: string;
        }
        const activities: Activity[] = [];

        recentContracts.forEach((contract) => {
            activities.push({
                id: `contract-${contract.id}`,
                action: `Thêm hợp đồng ${contract.contractNumber}`,
                time: contract.createdAt,
                user: contract.company.name,
                type: "contract",
            });
        });

        recentInvoices.forEach((invoice) => {
            if (invoice.approvedAt && invoice.approvedBy) {
                activities.push({
                    id: `invoice-approved-${invoice.id}`,
                    action: `Duyệt hóa đơn ${invoice.invoiceNumber}`,
                    time: invoice.approvedAt,
                    user: invoice.approvedBy.name,
                    type: "invoice",
                });
            } else {
                activities.push({
                    id: `invoice-${invoice.id}`,
                    action: `Thêm hóa đơn ${invoice.invoiceNumber}`,
                    time: invoice.createdAt,
                    user: "Hệ thống",
                    type: "invoice",
                });
            }
        });

        recentPayments.forEach((payment) => {
            activities.push({
                id: `payment-${payment.id}`,
                action: `Thanh toán hợp đồng ${payment.contract.contractNumber}`,
                time: payment.createdAt,
                user: "Kế toán",
                type: "payment",
            });
        });

        recentCompanies.forEach((company) => {
            activities.push({
                id: `company-${company.id}`,
                action: `Thêm công ty ${company.name}`,
                time: company.createdAt,
                user: "Admin",
                type: "company",
            });
        });

        // Sort by time and take top 10
        activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
        const topActivities = activities.slice(0, 10);

        // Format time relative to now
        const formatRelativeTime = (date: Date) => {
            const now = new Date();
            const diffMs = now.getTime() - new Date(date).getTime();
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);
            const diffDays = Math.floor(diffMs / 86400000);

            if (diffMins < 1) return "Vừa xong";
            if (diffMins < 60) return `${diffMins} phút trước`;
            if (diffHours < 24) return `${diffHours} giờ trước`;
            if (diffDays === 1) return "Hôm qua";
            if (diffDays < 7) return `${diffDays} ngày trước`;
            return new Date(date).toLocaleDateString("vi-VN");
        };

        const formattedActivities = topActivities.map((activity) => ({
            ...activity,
            time: formatRelativeTime(activity.time),
        }));

        return NextResponse.json(formattedActivities);
    } catch (error) {
        console.error("Error fetching activities:", error);
        return NextResponse.json(
            { error: "Failed to fetch activities" },
            { status: 500 }
        );
    }
}
