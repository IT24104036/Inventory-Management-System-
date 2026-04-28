import { AlertTriangle, Clock, ShieldAlert } from "lucide-react";

export const RISK_CONFIG = {
    Expired: { badge: "bg-red-100 text-red-700", icon: ShieldAlert, iconCls: "text-red-600" },
    "High Risk": { badge: "bg-red-100 text-red-600", icon: ShieldAlert, iconCls: "text-red-500" },
    Warning: { badge: "bg-orange-100 text-orange-600", icon: Clock, iconCls: "text-orange-500" },
    "Near Expiry": { badge: "bg-yellow-100 text-yellow-600", icon: AlertTriangle, iconCls: "text-yellow-600" },
};

export const STATUS_CONFIG = {
    PENDING: { badge: "bg-blue-100 text-blue-600", label: "Pending" },
    ACTIVE: { badge: "bg-[#007A5E]/10 text-[#007A5E]", label: "Active" },
    REJECTED: { badge: "bg-red-100 text-red-500", label: "Rejected" },
    INACTIVE: { badge: "bg-slate-100 text-slate-600", label: "Inactive" },
};

export function getAlertsErrorMessage(error, fallback = "Something went wrong.") {
    if (!error) return fallback;
    if (typeof error === "string") return error;
    if (typeof error.message === "string" && error.message.trim()) return error.message.trim();
    if (typeof error.response?.data?.message === "string" && error.response.data.message.trim()) {
        return error.response.data.message.trim();
    }
    return fallback;
}

export function getDiscountSortValue(discount, column) {
    switch (column) {
        case "productName":
            return discount.product?.name ?? "";
        case "daysLeft":
            return discount.daysLeft ?? 9999;
        case "batchQty":
            return discount.batch?.quantity ?? 0;
        case "suggestedRate":
            return discount.suggestedRate ?? 0;
        case "finalRate":
            return discount.finalRate ?? -1;
        case "status":
            return discount.status ?? "";
        default:
            return "";
    }
}

export function getSortedDiscounts(discounts, statusFilter, sortCol, sortDir) {
    return discounts
        .filter((discount) => statusFilter === "all" || discount.status === statusFilter)
        .sort((a, b) => {
            const valueA = getDiscountSortValue(a, sortCol);
            const valueB = getDiscountSortValue(b, sortCol);

            if (typeof valueA === "number" && typeof valueB === "number") {
                return sortDir === "asc" ? valueA - valueB : valueB - valueA;
            }

            return sortDir === "asc"
                ? String(valueA).localeCompare(String(valueB))
                : String(valueB).localeCompare(String(valueA));
        });
}

export function getDaysLeftLabel(daysLeft) {
    if (daysLeft == null) return "--";
    if (daysLeft < 0) return `${Math.abs(daysLeft)}d ago`;
    if (daysLeft === 0) return "Today";
    return `${daysLeft}d`;
}

export function getDaysLeftColor(daysLeft) {
    if (daysLeft == null) return "text-[#0F172A]/35";
    if (daysLeft <= 3) return "text-red-500";
    if (daysLeft <= 5) return "text-orange-500";
    return "text-yellow-600";
}

export function formatImpactScore(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return "--";
    return number.toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}
