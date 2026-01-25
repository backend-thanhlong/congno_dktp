"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, FileText, Receipt, CreditCard, TrendingUp, TrendingDown, Users, Activity } from "lucide-react";
import { formatCurrency } from "@/lib/dashboard-utils";

const roleLabels: Record<string, string> = {
    ADMIN: "Quản trị viên",
    KHOA_DUOC: "Khoa Dược",
    KE_TOAN: "Kế Toán",
    LANH_DAO: "Lãnh Đạo",
};

interface DashboardStats {
    companies: { total: number; change: string };
    contracts: { total: number; change: string; active: number; expired: number; terminated: number };
    invoices: { total: number; change: string; pending: number; paid: number; overdue: number };
    payments: { total: string; change: string };
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
    topCompanies: Array<{ name: string; contractCount: number }>;
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

                // Fetch all dashboard data
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

    // Loading skeleton
    if (loading) {
        return (
            <div className="space-y-8">
                <div className="flex flex-col gap-2">
                    <div className="h-9 w-64 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-6 w-96 bg-slate-100 rounded animate-pulse"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-32 bg-slate-100 rounded-lg animate-pulse"></div>
                    ))}
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="flex items-center justify-center p-8">
                <Card className="max-w-md">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <div className="text-red-500 text-5xl">⚠️</div>
                            <h3 className="text-lg font-semibold text-slate-800">Lỗi tải dữ liệu</h3>
                            <p className="text-slate-600">{error}</p>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                Tải lại trang
                            </button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    const statsCards = stats ? [
        {
            title: "Công ty",
            value: stats.companies.total.toString(),
            change: stats.companies.change,
            icon: Building2,
            color: "from-blue-500 to-cyan-500",
            bgColor: "bg-blue-500/10",
            iconColor: "text-blue-500",
        },
        {
            title: "Hợp đồng",
            value: stats.contracts.total.toString(),
            change: stats.contracts.change,
            icon: FileText,
            color: "from-purple-500 to-pink-500",
            bgColor: "bg-purple-500/10",
            iconColor: "text-purple-500",
        },
        {
            title: "Hóa đơn",
            value: stats.invoices.total.toString(),
            change: stats.invoices.change,
            icon: Receipt,
            color: "from-orange-500 to-red-500",
            bgColor: "bg-orange-500/10",
            iconColor: "text-orange-500",
        },
        {
            title: "Thanh toán",
            value: formatCurrency(stats.payments.total),
            change: stats.payments.change,
            icon: CreditCard,
            color: "from-green-500 to-emerald-500",
            bgColor: "bg-green-500/10",
            iconColor: "text-green-500",
        },
    ] : [];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold text-slate-800">
                    Xin chào, {userName}! 👋
                </h1>
                <p className="text-slate-600">
                    Chào mừng bạn đến với hệ thống Quản lý Công Nợ Nhà Thuốc. Vai trò của bạn:{" "}
                    <span className="text-blue-600 font-medium">{roleLabels[userRole]}</span>
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {statsCards.map((stat) => {
                    const Icon = stat.icon;
                    const isPositive = stat.change.startsWith("+");
                    const TrendIcon = isPositive ? TrendingUp : TrendingDown;

                    return (
                        <Card
                            key={stat.title}
                            className="bg-white/80 border-white/50 shadow-sm backdrop-blur-sm hover:shadow-md hover:bg-white transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                        >
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="space-y-2">
                                        <p className="text-sm text-slate-500">{stat.title}</p>
                                        <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
                                        <div className="flex items-center gap-1">
                                            <TrendIcon className={`w-4 h-4 ${isPositive ? "text-emerald-500" : "text-red-500"}`} />
                                            <span className={`text-sm ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
                                                {stat.change}
                                            </span>
                                            <span className="text-xs text-slate-400">so với tháng trước</span>
                                        </div>
                                    </div>
                                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                                        <Icon className={`w-6 h-6 ${stat.iconColor}`} />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            {/* Analytics Cards Row */}
            {stats && analytics && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Contract Status Breakdown */}
                    <Card className="bg-white/70 border-white/50 shadow-sm backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-slate-800 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-purple-500" />
                                Trạng thái hợp đồng
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-green-700 font-medium">Đang hiệu lực</span>
                                    <span className="text-lg font-bold text-green-700">{stats.contracts.active}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-red-700 font-medium">Hết hạn</span>
                                    <span className="text-lg font-bold text-red-700">{stats.contracts.expired}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-700 font-medium">Đã chấm dứt</span>
                                    <span className="text-lg font-bold text-gray-700">{stats.contracts.terminated}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Invoice Status Breakdown */}
                    <Card className="bg-white/70 border-white/50 shadow-sm backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-slate-800 flex items-center gap-2">
                                <Receipt className="w-5 h-5 text-orange-500" />
                                Trạng thái hóa đơn
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-yellow-700 font-medium">Chờ xử lý</span>
                                    <span className="text-lg font-bold text-yellow-700">{stats.invoices.pending}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-blue-700 font-medium">Đã thanh toán</span>
                                    <span className="text-lg font-bold text-blue-700">{stats.invoices.paid}</span>
                                </div>
                            </div>
                            <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-orange-700 font-medium">Quá hạn</span>
                                    <span className="text-lg font-bold text-orange-700">{stats.invoices.overdue}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Top Companies */}
                    <Card className="bg-white/70 border-white/50 shadow-sm backdrop-blur-sm">
                        <CardHeader>
                            <CardTitle className="text-slate-800 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-blue-500" />
                                Top công ty
                            </CardTitle>
                            <CardDescription className="text-slate-500">
                                Theo số lượng hợp đồng
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {analytics.topCompanies.length > 0 ? (
                                analytics.topCompanies.map((company, index) => (
                                    <div
                                        key={index}
                                        className="p-2 bg-white/60 rounded-lg border border-slate-100 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                                {index + 1}
                                            </span>
                                            <span className="text-sm text-slate-700">{company.name}</span>
                                        </div>
                                        <span className="text-sm font-semibold text-blue-600">{company.contractCount}</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-slate-500 text-center py-4">Chưa có dữ liệu</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Guide */}
                <Card className="bg-white/70 border-white/50 shadow-sm backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-slate-800 flex items-center gap-2">
                            <Users className="w-5 h-5 text-blue-500" />
                            Hướng dẫn nhanh
                        </CardTitle>
                        <CardDescription className="text-slate-500">
                            Một số thao tác thường dùng trong hệ thống
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="p-3 bg-white/60 rounded-lg border border-slate-100">
                            <p className="text-sm text-slate-600">
                                <span className="text-blue-600 font-medium">Khoa Dược:</span> Có quyền thêm/sửa hợp đồng, phụ lục, nghiệm thu, thanh toán và hóa đơn.
                            </p>
                        </div>
                        <div className="p-3 bg-white/50 rounded-lg border border-slate-100">
                            <p className="text-sm text-slate-600">
                                <span className="text-emerald-600 font-medium">Kế Toán:</span> Xem và theo dõi các công nợ, thanh toán.
                            </p>
                        </div>
                        <div className="p-3 bg-white/50 rounded-lg border border-slate-100">
                            <p className="text-sm text-slate-600">
                                <span className="text-purple-600 font-medium">Lãnh Đạo:</span> Xem báo cáo tổng hợp và giám sát.
                            </p>
                        </div>
                        <div className="p-3 bg-white/50 rounded-lg border border-slate-100">
                            <p className="text-sm text-slate-600">
                                <span className="text-red-500 font-medium">Admin:</span> Quản lý tài khoản người dùng và toàn bộ hệ thống.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Activities */}
                <Card className="bg-white/70 border-white/50 shadow-sm backdrop-blur-sm">
                    <CardHeader>
                        <CardTitle className="text-slate-800 flex items-center gap-2">
                            <Activity className="w-5 h-5 text-emerald-500" />
                            Hoạt động gần đây
                        </CardTitle>
                        <CardDescription className="text-slate-500">
                            Các cập nhật mới nhất trong hệ thống
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {activities.length > 0 ? (
                            activities.slice(0, 4).map((activity) => (
                                <div
                                    key={activity.id}
                                    className="flex items-center gap-4 p-3 bg-white/60 rounded-lg border border-slate-100"
                                >
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-slate-700 truncate">{activity.action}</p>
                                        <p className="text-xs text-slate-500">
                                            {activity.user} • {activity.time}
                                        </p>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <p className="text-sm text-slate-500 text-center py-4">Chưa có hoạt động nào</p>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
