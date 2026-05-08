"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import {
    AlertTriangle,
    Building2,
    CheckCircle2,
    Clock3,
    CreditCard,
    FileText,
    Receipt,
    RefreshCw,
    ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const roleLabels: Record<string, string> = {
    ADMIN: "Quản trị viên",
    KHOA_DUOC: "Khoa Dược",
    KE_TOAN: "Kế toán",
    LANH_DAO: "Lãnh đạo",
};

const contractStatusLabels: Record<string, string> = {
    ACTIVE: "Hiệu lực",
    EXPIRED: "Hết hạn",
    TERMINATED: "Đã hủy",
};

const invoiceStatusLabels: Record<string, string> = {
    PENDING: "Chờ xử lý",
    PAID: "Đã thanh toán",
    OVERDUE: "Quá hạn",
};

const priorityLabels: Record<string, string> = {
    HIGH: "Cao",
    NORMAL: "Bình thường",
    LOW: "Thấp",
};

const chartColors = {
    green: "#16a34a",
    amber: "#d97706",
    red: "#dc2626",
    blue: "#2563eb",
    cyan: "#0891b2",
    violet: "#7c3aed",
    slate: "#64748b",
};

interface DashboardStats {
    companies: { total: number; change: string };
    contracts: {
        total: number;
        change: string;
        active: number;
        expired: number;
        terminated: number;
        highPriority: number;
        expiringSoon: number;
        totalValue: string;
    };
    invoices: {
        total: number;
        change: string;
        pending: number;
        paid: number;
        overdue: number;
        totalAmount: string;
        pendingAmount: string;
        overdueAmount: string;
    };
    payments: {
        total: string;
        change: string;
        currentMonth: string;
    };
    risks: {
        expiringSoonContracts: number;
        overdueInvoices: number;
        pendingInvoices: number;
        highPriorityContracts: number;
    };
}

interface ActivityItem {
    id: string;
    action: string;
    time: string;
    user: string;
    type: string;
}

interface Analytics {
    contractDistribution: Array<{ status: string; count: number }>;
    invoiceDistribution: Array<{ status: string; count: number }>;
    priorityDistribution: Array<{ priority: string; count: number }>;
    paymentTrends: Array<{ month: string; amount: number }>;
    contractTrends: Array<{ month: string; count: number; value: number }>;
    topCompanies: Array<{ name: string; contractCount: number; totalValue: number }>;
}

interface KpiCardProps {
    title: string;
    value: string;
    caption: string;
    icon: ComponentType<{ className?: string }>;
    tone: "blue" | "green" | "amber" | "red" | "violet" | "cyan";
}

const toneClasses: Record<KpiCardProps["tone"], { bg: string; text: string; border: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    green: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
    red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    violet: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
    cyan: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
};

function formatCurrency(value: number | string) {
    const amount = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(amount)) return "0 ₫";

    return new Intl.NumberFormat("vi-VN", {
        style: "currency",
        currency: "VND",
        maximumFractionDigits: 0,
    }).format(amount);
}

function formatCompactCurrency(value: number | string) {
    const amount = typeof value === "string" ? Number(value) : value;
    if (!Number.isFinite(amount)) return "0 ₫";

    if (amount >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1)} tỷ`;
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} triệu`;
    return formatCurrency(amount);
}

function KpiCard({ title, value, caption, icon: Icon, tone }: KpiCardProps) {
    const toneClass = toneClasses[tone];

    return (
        <Card className="border-slate-200 bg-white shadow-sm">
            <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 space-y-2">
                        <p className="text-sm font-medium text-slate-500">{title}</p>
                        <p className="text-2xl font-semibold text-slate-900">{value}</p>
                        <p className="text-xs text-slate-500">{caption}</p>
                    </div>
                    <div className={`rounded-md border p-2 ${toneClass.bg} ${toneClass.border}`}>
                        <Icon className={`h-5 w-5 ${toneClass.text}`} />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function ChartCard({
    title,
    description,
    children,
}: {
    title: string;
    description?: string;
    children: ReactNode;
}) {
    return (
        <Card className="border-slate-200 bg-white shadow-sm">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-slate-900">{title}</CardTitle>
                {description && (
                    <CardDescription className="text-sm text-slate-500">{description}</CardDescription>
                )}
            </CardHeader>
            <CardContent>{children}</CardContent>
        </Card>
    );
}

function EmptyChart() {
    return (
        <div className="flex h-[260px] items-center justify-center rounded-md border border-dashed border-slate-200 text-sm text-slate-500">
            Chưa có dữ liệu
        </div>
    );
}

export default function DashboardPage() {
    const { data: session } = useSession();
    const userName = session?.user?.name || "User";
    const userRole = (session?.user as { role?: string })?.role || "KHOA_DUOC";

    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activities, setActivities] = useState<ActivityItem[]>([]);
    const [analytics, setAnalytics] = useState<Analytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchDashboardData() {
            try {
                setLoading(true);
                setError(null);

                const [statsRes, activitiesRes, analyticsRes] = await Promise.all([
                    fetch("/api/dashboard/stats"),
                    fetch("/api/dashboard/activities"),
                    fetch("/api/dashboard/analytics"),
                ]);

                if (!statsRes.ok || !activitiesRes.ok || !analyticsRes.ok) {
                    throw new Error("Failed to fetch dashboard data");
                }

                const [statsData, activitiesData, analyticsData] = await Promise.all([
                    statsRes.json(),
                    activitiesRes.json(),
                    analyticsRes.json(),
                ]);

                setStats(statsData);
                setActivities(activitiesData);
                setAnalytics(analyticsData);
            } catch (err) {
                console.error("Error fetching dashboard data:", err);
                setError("Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.");
            } finally {
                setLoading(false);
            }
        }

        fetchDashboardData();
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="space-y-2">
                    <div className="h-8 w-72 animate-pulse rounded bg-slate-200" />
                    <div className="h-5 w-full max-w-xl animate-pulse rounded bg-slate-100" />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                        <div key={item} className="h-32 animate-pulse rounded-lg bg-slate-100" />
                    ))}
                </div>
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                    <div className="h-80 animate-pulse rounded-lg bg-slate-100" />
                    <div className="h-80 animate-pulse rounded-lg bg-slate-100" />
                </div>
            </div>
        );
    }

    if (error || !stats || !analytics) {
        return (
            <div className="flex min-h-[360px] items-center justify-center">
                <Card className="w-full max-w-md border-slate-200 bg-white">
                    <CardContent className="space-y-4 p-6 text-center">
                        <ShieldAlert className="mx-auto h-10 w-10 text-red-600" />
                        <div>
                            <h2 className="text-lg font-semibold text-slate-900">Lỗi tải dữ liệu</h2>
                            <p className="mt-1 text-sm text-slate-500">{error || "Dữ liệu dashboard chưa sẵn sàng."}</p>
                        </div>
                        <Button onClick={() => window.location.reload()} className="bg-blue-600 text-white hover:bg-blue-700">
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Tải lại
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const contractStatusData = [
        { name: contractStatusLabels.ACTIVE, value: stats.contracts.active, color: chartColors.green },
        { name: contractStatusLabels.EXPIRED, value: stats.contracts.expired, color: chartColors.red },
        { name: contractStatusLabels.TERMINATED, value: stats.contracts.terminated, color: chartColors.slate },
    ].filter((item) => item.value > 0);

    const invoiceStatusData = [
        { name: invoiceStatusLabels.PENDING, value: stats.invoices.pending, color: chartColors.amber },
        { name: invoiceStatusLabels.PAID, value: stats.invoices.paid, color: chartColors.blue },
        { name: invoiceStatusLabels.OVERDUE, value: stats.invoices.overdue, color: chartColors.red },
    ].filter((item) => item.value > 0);

    const priorityData = analytics.priorityDistribution.map((item) => ({
        name: priorityLabels[item.priority] || item.priority,
        count: item.count,
    }));

    const topCompanyMax = Math.max(...analytics.topCompanies.map((item) => item.contractCount), 1);
    const today = new Intl.DateTimeFormat("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date());

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-500">Dashboard tổng quan</p>
                    <h1 className="text-2xl font-semibold text-slate-900">
                        Quản lý công nợ nhà thuốc
                    </h1>
                    <p className="max-w-3xl text-sm text-slate-500">
                        Xin chào {userName}. Vai trò:{" "}
                        <span className="font-medium text-slate-700">{roleLabels[userRole] || userRole}</span>.
                    </p>
                </div>
                <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
                    Cập nhật: {today}
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <KpiCard
                    title="Tổng giá trị hợp đồng"
                    value={formatCompactCurrency(stats.contracts.totalValue)}
                    caption={`${stats.contracts.total} hợp đồng, ${stats.contracts.change} trong tháng`}
                    icon={FileText}
                    tone="blue"
                />
                <KpiCard
                    title="Thanh toán đề nghị"
                    value={formatCompactCurrency(stats.payments.total)}
                    caption={`${stats.payments.change} so với tháng trước`}
                    icon={CreditCard}
                    tone="green"
                />
                <KpiCard
                    title="Hợp đồng hiệu lực"
                    value={stats.contracts.active.toString()}
                    caption={`${stats.contracts.expiringSoon} hợp đồng sắp hết hạn 30 ngày`}
                    icon={CheckCircle2}
                    tone="cyan"
                />
                <KpiCard
                    title="Hợp đồng hết hạn"
                    value={stats.contracts.expired.toString()}
                    caption={`${stats.contracts.highPriority} hợp đồng ưu tiên cao`}
                    icon={AlertTriangle}
                    tone="red"
                />
                <KpiCard
                    title="Hóa đơn chờ xử lý"
                    value={stats.invoices.pending.toString()}
                    caption={formatCompactCurrency(stats.invoices.pendingAmount)}
                    icon={Clock3}
                    tone="amber"
                />
                <KpiCard
                    title="Hóa đơn quá hạn"
                    value={stats.invoices.overdue.toString()}
                    caption={formatCompactCurrency(stats.invoices.overdueAmount)}
                    icon={Receipt}
                    tone="violet"
                />
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <ChartCard
                    title="Dòng thanh toán 6 tháng"
                    description="Tổng giá trị thanh toán đề nghị theo tháng"
                >
                    {analytics.paymentTrends.some((item) => item.amount > 0) ? (
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.paymentTrends} margin={{ left: 8, right: 16, top: 12 }}>
                                    <defs>
                                        <linearGradient id="paymentFill" x1="0" x2="0" y1="0" y2="1">
                                            <stop offset="5%" stopColor={chartColors.blue} stopOpacity={0.24} />
                                            <stop offset="95%" stopColor={chartColors.blue} stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                                    <YAxis
                                        tickLine={false}
                                        axisLine={false}
                                        fontSize={12}
                                        tickFormatter={(value) => formatCompactCurrency(Number(value))}
                                    />
                                    <Tooltip
                                        formatter={(value) => [formatCurrency(Number(value)), "Thanh toán"]}
                                        labelStyle={{ color: "#0f172a" }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="amount"
                                        stroke={chartColors.blue}
                                        fill="url(#paymentFill)"
                                        strokeWidth={2}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyChart />
                    )}
                </ChartCard>

                <ChartCard title="Trạng thái hợp đồng" description="Cơ cấu hợp đồng theo hiệu lực">
                    {contractStatusData.length > 0 ? (
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={contractStatusData}
                                        dataKey="value"
                                        innerRadius={62}
                                        outerRadius={92}
                                        paddingAngle={3}
                                    >
                                        {contractStatusData.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [`${value} hợp đồng`, "Số lượng"]} />
                                    <Legend verticalAlign="bottom" height={32} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyChart />
                    )}
                </ChartCard>

                <ChartCard title="Trạng thái hóa đơn" description="Cơ cấu hóa đơn theo xử lý">
                    {invoiceStatusData.length > 0 ? (
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={invoiceStatusData}
                                        dataKey="value"
                                        innerRadius={62}
                                        outerRadius={92}
                                        paddingAngle={3}
                                    >
                                        {invoiceStatusData.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(value) => [`${value} hóa đơn`, "Số lượng"]} />
                                    <Legend verticalAlign="bottom" height={32} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyChart />
                    )}
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <ChartCard
                    title="Hợp đồng tạo mới 6 tháng"
                    description="Số lượng hợp đồng và giá trị phát sinh"
                >
                    {analytics.contractTrends.some((item) => item.count > 0 || item.value > 0) ? (
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={analytics.contractTrends} margin={{ left: 8, right: 16, top: 12 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} />
                                    <YAxis yAxisId="left" tickLine={false} axisLine={false} fontSize={12} />
                                    <YAxis
                                        yAxisId="right"
                                        orientation="right"
                                        tickLine={false}
                                        axisLine={false}
                                        fontSize={12}
                                        tickFormatter={(value) => formatCompactCurrency(Number(value))}
                                    />
                                    <Tooltip
                                        formatter={(value, name) => (
                                            name === "value"
                                                ? [formatCurrency(Number(value)), "Giá trị"]
                                                : [`${value} hợp đồng`, "Số lượng"]
                                        )}
                                    />
                                    <Legend />
                                    <Bar yAxisId="left" dataKey="count" name="Số lượng" fill={chartColors.cyan} radius={[4, 4, 0, 0]} />
                                    <Bar yAxisId="right" dataKey="value" name="Giá trị" fill={chartColors.violet} radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyChart />
                    )}
                </ChartCard>

                <ChartCard title="Hợp đồng theo ưu tiên" description="Mức độ ưu tiên đang được gán">
                    {priorityData.length > 0 ? (
                        <div className="h-[300px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={priorityData} layout="vertical" margin={{ left: 16, right: 24, top: 12 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                    <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} />
                                    <YAxis dataKey="name" type="category" tickLine={false} axisLine={false} width={90} />
                                    <Tooltip formatter={(value) => [`${value} hợp đồng`, "Số lượng"]} />
                                    <Bar dataKey="count" fill={chartColors.amber} radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <EmptyChart />
                    )}
                </ChartCard>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                <ChartCard title="Cảnh báo cần chú ý" description="Các nhóm việc cần theo dõi trước">
                    <div className="space-y-3">
                        <div className="rounded-md border border-red-200 bg-red-50 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-red-700">Hóa đơn quá hạn</span>
                                <span className="text-lg font-semibold text-red-700">{stats.risks.overdueInvoices}</span>
                            </div>
                        </div>
                        <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-amber-700">Hóa đơn chờ xử lý</span>
                                <span className="text-lg font-semibold text-amber-700">{stats.risks.pendingInvoices}</span>
                            </div>
                        </div>
                        <div className="rounded-md border border-blue-200 bg-blue-50 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-blue-700">Hợp đồng sắp hết hạn</span>
                                <span className="text-lg font-semibold text-blue-700">{stats.risks.expiringSoonContracts}</span>
                            </div>
                        </div>
                        <div className="rounded-md border border-violet-200 bg-violet-50 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-medium text-violet-700">Hợp đồng ưu tiên cao</span>
                                <span className="text-lg font-semibold text-violet-700">{stats.risks.highPriorityContracts}</span>
                            </div>
                        </div>
                    </div>
                </ChartCard>

                <ChartCard title="Top công ty" description="Theo số lượng hợp đồng">
                    <div className="space-y-4">
                        {analytics.topCompanies.length > 0 ? (
                            analytics.topCompanies.map((company, index) => (
                                <div key={company.name} className="space-y-2">
                                    <div className="flex items-center justify-between gap-3 text-sm">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-xs font-semibold text-blue-700">
                                                {index + 1}
                                            </span>
                                            <span className="truncate font-medium text-slate-700">{company.name}</span>
                                        </div>
                                        <span className="shrink-0 text-slate-500">{company.contractCount} HĐ</span>
                                    </div>
                                    <div className="h-2 rounded-full bg-slate-100">
                                        <div
                                            className="h-2 rounded-full bg-blue-600"
                                            style={{ width: `${Math.max(8, (company.contractCount / topCompanyMax) * 100)}%` }}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500">{formatCompactCurrency(company.totalValue)}</p>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-md border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                                Chưa có dữ liệu công ty
                            </div>
                        )}
                    </div>
                </ChartCard>

                <ChartCard title="Hoạt động gần đây" description="Các cập nhật mới nhất trong hệ thống">
                    <div className="space-y-3">
                        {activities.length > 0 ? (
                            activities.slice(0, 6).map((activity) => (
                                <div key={activity.id} className="flex items-start gap-3 rounded-md border border-slate-100 bg-slate-50 p-3">
                                    <div className="mt-1 rounded-md bg-white p-1.5 text-slate-500">
                                        {activity.type === "payment" ? (
                                            <CreditCard className="h-4 w-4" />
                                        ) : activity.type === "invoice" ? (
                                            <Receipt className="h-4 w-4" />
                                        ) : activity.type === "company" ? (
                                            <Building2 className="h-4 w-4" />
                                        ) : (
                                            <FileText className="h-4 w-4" />
                                        )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-medium text-slate-700">{activity.action}</p>
                                        <p className="text-xs text-slate-500">
                                            {activity.user} · {activity.time}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-md border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                                Chưa có hoạt động
                            </div>
                        )}
                    </div>
                </ChartCard>
            </div>

            <Card className="border-slate-200 bg-white shadow-sm">
                <CardContent className="grid grid-cols-1 gap-4 p-4 md:grid-cols-4">
                    <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Công ty</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{stats.companies.total}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Tổng hóa đơn</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{stats.invoices.total}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Giá trị hóa đơn</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{formatCompactCurrency(stats.invoices.totalAmount)}</p>
                    </div>
                    <div className="rounded-md bg-slate-50 p-3">
                        <p className="text-xs text-slate-500">Thanh toán tháng này</p>
                        <p className="mt-1 text-lg font-semibold text-slate-900">{formatCompactCurrency(stats.payments.currentMonth)}</p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
