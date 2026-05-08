"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    LayoutDashboard,
    Building2,
    FileText,
    FileCheck,
    Receipt,
    CreditCard,
    Settings,
    ChevronDown,
    ChevronRight,
    LogOut,
    User,
    Menu,
    X,
} from "lucide-react";

const roleLabels: Record<string, string> = {
    ADMIN: "Admin",
    KHOA_DUOC: "Khoa Dược",
    KE_TOAN: "Kế Toán",
    LANH_DAO: "Lãnh Đạo",
};

const roleBadgeColors: Record<string, string> = {
    ADMIN: "bg-red-50 text-red-700 border-red-200",
    KHOA_DUOC: "bg-blue-50 text-blue-700 border-blue-200",
    KE_TOAN: "bg-green-50 text-green-700 border-green-200",
    LANH_DAO: "bg-purple-50 text-purple-700 border-purple-200",
};

interface NavItem {
    title: string;
    href?: string;
    icon: React.ElementType;
    children?: { title: string; href: string; icon: React.ElementType }[];
    adminOnly?: boolean;
}

const navItems: NavItem[] = [
    {
        title: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
    },
    {
        title: "Công ty",
        href: "/dashboard/cong-ty",
        icon: Building2,
    },
    {
        title: "Hợp đồng",
        icon: FileText,
        children: [
            { title: "Hợp đồng", href: "/dashboard/hop-dong", icon: FileText },
            { title: "Phụ lục hợp đồng", href: "/dashboard/phu-luc", icon: FileCheck },
            { title: "Nghiệm thu hợp đồng", href: "/dashboard/nghiem-thu", icon: FileCheck },
            { title: "Thanh toán hợp đồng", href: "/dashboard/thanh-toan", icon: CreditCard },
        ],
    },
    {
        title: "Hóa đơn",
        href: "/dashboard/hoa-don",
        icon: Receipt,
    },
    {
        title: "Người dùng",
        href: "/dashboard/nguoi-dung",
        icon: User,
        adminOnly: true,
    },
    {
        title: "Cài đặt",
        href: "/dashboard/cai-dat",
        icon: Settings,
    },
];

export function AppSidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [expandedItems, setExpandedItems] = useState<string[]>(["Hợp đồng"]);
    const [mobileOpen, setMobileOpen] = useState(false);

    const userRole = (session?.user as { role?: string })?.role || "KHOA_DUOC";
    const userName = session?.user?.name || "User";

    const toggleExpand = (title: string) => {
        setExpandedItems((prev) =>
            prev.includes(title)
                ? prev.filter((item) => item !== title)
                : [...prev, title]
        );
    };

    const filteredNavItems = navItems.filter(
        (item) => !item.adminOnly || userRole === "ADMIN"
    );

    const isActive = (href: string) => pathname === href;
    const isChildActive = (children?: { href: string }[]) =>
        children?.some((child) => pathname === child.href);

    const sidebarContent = (
        <>
            {/* Logo */}
            <div className="p-6 border-b border-slate-200 bg-white/50 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <Image
                        src="/logodktp.png"
                        alt="Logo DKTP"
                        width={40}
                        height={40}
                        className="w-10 h-10 object-contain"
                    />
                    <div>
                        <h1 className="font-bold text-slate-800">Nhà thuốc Bệnh viện</h1>
                        <p className="text-xs text-slate-500">Quản lý nhà thuốc</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {filteredNavItems.map((item) => {
                    const Icon = item.icon;
                    const hasChildren = item.children && item.children.length > 0;
                    const isExpanded = expandedItems.includes(item.title);
                    const active = item.href ? isActive(item.href) : isChildActive(item.children);

                    if (hasChildren) {
                        return (
                            <div key={item.title}>
                                <button
                                    onClick={() => toggleExpand(item.title)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                        active
                                            ? "bg-sky-100 text-sky-700"
                                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span className="flex-1 text-left">{item.title}</span>
                                    {isExpanded ? (
                                        <ChevronDown className="w-4 h-4" />
                                    ) : (
                                        <ChevronRight className="w-4 h-4" />
                                    )}
                                </button>
                                {isExpanded && (
                                    <div className="ml-4 mt-1 space-y-1 border-l border-slate-200 pl-4">
                                        {item.children?.map((child) => {
                                            const ChildIcon = child.icon;
                                            return (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    onClick={() => setMobileOpen(false)}
                                                    className={cn(
                                                        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200",
                                                        isActive(child.href)
                                                            ? "bg-sky-50 text-sky-700 font-medium"
                                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                                    )}
                                                >
                                                    <ChildIcon className="w-4 h-4" />
                                                    {child.title}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.title}
                            href={item.href!}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                                active
                                    ? "bg-sky-100/80 text-sky-700 shadow-sm"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            )}
                        >
                            <Icon className="w-5 h-5" />
                            {item.title}
                        </Link>
                    );
                })}
            </nav>

            {/* User Section */}
            <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors">
                            <Avatar className="w-9 h-9">
                                <AvatarFallback className="bg-gradient-to-br from-sky-400 to-blue-600 text-white text-sm">
                                    {userName.charAt(0).toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left">
                                <p className="text-sm font-medium text-slate-700 truncate">{userName}</p>
                                <Badge className={cn("text-xs mt-1", roleBadgeColors[userRole])}>
                                    {roleLabels[userRole]}
                                </Badge>
                            </div>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56 bg-white border-slate-200">
                        <DropdownMenuItem className="text-slate-600 focus:text-slate-900 focus:bg-slate-100">
                            <User className="w-4 h-4 mr-2" />
                            Thông tin tài khoản
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-slate-100" />
                        <DropdownMenuItem
                            onClick={() => signOut({ callbackUrl: "/login" })}
                            className="text-red-500 focus:text-red-600 focus:bg-red-50"
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Đăng xuất
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile Menu Button */}
            <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white text-slate-700 border border-slate-200 shadow-lg"
            >
                {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-40 w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200 flex flex-col transition-transform duration-300 shadow-xl lg:shadow-none",
                    mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                {sidebarContent}
            </aside>
        </>
    );
}
