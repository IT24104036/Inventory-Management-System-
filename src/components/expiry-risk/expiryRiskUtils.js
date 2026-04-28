import { AlertTriangle, CheckCircle2 } from "lucide-react";

export const RISK_CONFIG = {
    "High Risk": { color: "bg-red-100 text-red-700", bar: "bg-red-500", icon: AlertTriangle, border: "border-red-200", glow: "shadow-red-100" },
    Warning: { color: "bg-orange-100 text-orange-700", bar: "bg-orange-400", icon: AlertTriangle, border: "border-orange-200", glow: "shadow-orange-100" },
    "Low Risk": { color: "bg-emerald-100 text-emerald-700", bar: "bg-emerald-500", icon: CheckCircle2, border: "border-emerald-200", glow: "shadow-emerald-100" },
};

export const CATEGORIES = [
    "Bakery", "Beverages", "Dairy", "Deli", "Frozen_Meals",
    "Meat", "Pharmaceuticals", "Produce", "Ready_to_Eat", "Seafood", "Other",
];

export const WASTE_REASONS = [
    { value: "EXPIRED_DISPOSAL", label: "Expired disposal" },
    { value: "SPOILAGE", label: "Spoilage" },
    { value: "DAMAGE", label: "Damage" },
    { value: "RECALL", label: "Recall" },
    { value: "OTHER", label: "Other" },
];

export const defaultForm = {
    days_until_expiry: "",
    initial_quantity: "",
    units_sold: "",
    remaining_quantity: "",
    daily_demand: "",
    shelf_life_days: "",
    stock_pressure_ratio: "",
    category: "",
    is_weekend: "0",
    month: new Date().getMonth() + 1,
    demand_variability: "0.3",
    spoilage_sensitivity: "0.5",
};

export const MONTH_OPTIONS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const wasteReasonLabel = (code) => {
    if (!code) return "-";
    const row = WASTE_REASONS.find((reason) => reason.value === code);
    return row ? row.label : code;
};

export const localToday = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
};

export const isExpired = (dateStr) => {
    if (!dateStr) return false;
    return dateStr <= localToday();
};

export const daysFromToday = (dateStr) => {
    const todayMs = new Date(localToday()).getTime();
    const dMs = new Date(dateStr).getTime();
    return Math.round((todayMs - dMs) / 86400000);
};

export const formatCurrency = (value) =>
    Number(value || 0).toLocaleString("en-LK", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

export const getErrorMessage = (error, fallback) =>
    error instanceof Error && error.message ? error.message : fallback;
