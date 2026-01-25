/**
 * Format a number as Vietnamese Dong currency
 */
export function formatCurrency(amount: number | string): string {
    const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

    if (isNaN(numAmount)) return "₫0";

    // Format for billions
    if (numAmount >= 1_000_000_000) {
        return `₫${(numAmount / 1_000_000_000).toFixed(1)}B`;
    }

    // Format for millions
    if (numAmount >= 1_000_000) {
        return `₫${(numAmount / 1_000_000).toFixed(1)}M`;
    }

    // Format for thousands
    if (numAmount >= 1_000) {
        return `₫${(numAmount / 1_000).toFixed(1)}K`;
    }

    return `₫${numAmount.toLocaleString("vi-VN")}`;
}

/**
 * Calculate percentage change between two numbers
 */
export function calculatePercentageChange(current: number, previous: number): string {
    if (previous === 0) {
        return current > 0 ? "+100%" : "0%";
    }

    const change = ((current - previous) / previous) * 100;
    const formatted = change.toFixed(1);

    return change >= 0 ? `+${formatted}%` : `${formatted}%`;
}

/**
 * Format a date to Vietnamese locale
 */
export function formatDate(date: Date | string): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    return dateObj.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    });
}

/**
 * Format a datetime to Vietnamese locale with time
 */
export function formatDateTime(date: Date | string): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    return dateObj.toLocaleString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(date: Date | string): string {
    const dateObj = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();

    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return "Hôm qua";
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return formatDate(dateObj);
}

/**
 * Aggregate statistics from multiple sources
 */
export interface StatsSummary {
    total: number;
    change: string;
    percentChange?: string;
}

export function aggregateStats(
    current: number,
    previous: number
): StatsSummary {
    const change = current - previous;
    const percentChange = calculatePercentageChange(current, previous);

    return {
        total: current,
        change: change >= 0 ? `+${change}` : change.toString(),
        percentChange,
    };
}

/**
 * Get status color for UI display
 */
export function getStatusColor(status: string): {
    bg: string;
    text: string;
    border: string;
} {
    const colors: Record<string, { bg: string; text: string; border: string }> = {
        ACTIVE: {
            bg: "bg-green-50",
            text: "text-green-700",
            border: "border-green-200",
        },
        EXPIRED: {
            bg: "bg-red-50",
            text: "text-red-700",
            border: "border-red-200",
        },
        TERMINATED: {
            bg: "bg-gray-50",
            text: "text-gray-700",
            border: "border-gray-200",
        },
        PENDING: {
            bg: "bg-yellow-50",
            text: "text-yellow-700",
            border: "border-yellow-200",
        },
        PAID: {
            bg: "bg-blue-50",
            text: "text-blue-700",
            border: "border-blue-200",
        },
        OVERDUE: {
            bg: "bg-orange-50",
            text: "text-orange-700",
            border: "border-orange-200",
        },
        HIGH: {
            bg: "bg-red-50",
            text: "text-red-700",
            border: "border-red-200",
        },
        NORMAL: {
            bg: "bg-blue-50",
            text: "text-blue-700",
            border: "border-blue-200",
        },
        LOW: {
            bg: "bg-gray-50",
            text: "text-gray-700",
            border: "border-gray-200",
        },
    };

    return colors[status] || colors.NORMAL;
}

/**
 * Get status label in Vietnamese
 */
export function getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
        ACTIVE: "Đang hiệu lực",
        EXPIRED: "Hết hạn",
        TERMINATED: "Đã chấm dứt",
        PENDING: "Chờ xử lý",
        PAID: "Đã thanh toán",
        OVERDUE: "Quá hạn",
        HIGH: "Cao",
        NORMAL: "Bình thường",
        LOW: "Thấp",
    };

    return labels[status] || status;
}
