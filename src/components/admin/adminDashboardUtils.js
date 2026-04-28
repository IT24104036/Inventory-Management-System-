import { ArrowUpRight, TrendingUp, Package, Receipt, AlertTriangle } from "lucide-react";
import { daysLeftUntilExpiryYMD, isExpiredYMD } from "@/lib/dateUtils";

export const DASH_ALERT_WINDOW_DAYS = 7;
const DASH_WARNING_THRESHOLD = 40;
const DASH_HIGH_RISK_THRESHOLD = 70;

export const adminStats = [
  {
    label: "Total Stock",
    value: "...",
    sub: "Units across in-stock batches",
    icon: Package,
    color: "text-[#007A5E]",
    bg: "bg-[#007A5E]/10",
    cornerIcon: TrendingUp,
  },
  {
    label: "Waste (week)",
    value: "...",
    sub: "Last 7 days vs previous 7 days",
    icon: Receipt,
    color: "text-[#7C3AED]",
    bg: "bg-[#7C3AED]/10",
    cornerIcon: null,
  },
  {
    label: "Active Alerts",
    value: "...",
    sub: "Urgent batches (Loss Prevention)",
    icon: AlertTriangle,
    color: "text-[#9D1967]",
    bg: "bg-[#9D1967]/10",
    cornerIcon: TrendingUp,
  },
  {
    label: "Waste Prevented",
    value: "78%",
    sub: "Reduction vs previous 7 days",
    icon: TrendingUp,
    color: "text-[#7C3AED]",
    bg: "bg-[#7C3AED]/10",
    cornerIcon: ArrowUpRight,
  },
];

export const dashFormatExpiry = (expiryDate) => {
  if (!expiryDate) return "...";

  if (isExpiredYMD(expiryDate)) {
    const left = daysLeftUntilExpiryYMD(expiryDate);
    const daysAgo = left === null ? 0 : -left;
    return daysAgo === 0 ? "Expired today" : `Expired - ${daysAgo}d ago`;
  }

  const until = daysLeftUntilExpiryYMD(expiryDate);
  if (until === null) return "...";
  if (until === 1) return "Tomorrow";
  return `In ${until} days`;
};

export const dashIsUrgentBatch = (batch) => {
  if (!batch?.quantity || batch.quantity <= 0) return false;
  if (!batch.expiryDate) return false;
  if (isExpiredYMD(batch.expiryDate)) return true;
  if (batch.lastRiskLabel === "High Risk" || batch.lastRiskLabel === "Warning") {
    return true;
  }
  const riskPercent = dashRiskPercent(batch);
  return riskPercent != null && riskPercent >= DASH_WARNING_THRESHOLD;
};

export const dashRiskPresentation = (batch) => {
  if (isExpiredYMD(batch.expiryDate) && batch.quantity > 0) {
    return { label: "High Risk", badge: "bg-red-100 text-red-700" };
  }

  const mlLabel = batch.lastRiskLabel;
  if (mlLabel === "High Risk") return { label: "High Risk", badge: "bg-red-100 text-red-600" };
  if (mlLabel === "Warning") return { label: "Warning", badge: "bg-orange-100 text-orange-700" };
  if (mlLabel === "Low Risk") return { label: "Low Risk", badge: "bg-emerald-100 text-emerald-700" };

  const riskPercent = dashRiskPercent(batch);
  if (riskPercent != null) {
    if (riskPercent > DASH_HIGH_RISK_THRESHOLD) return { label: "High Risk", badge: "bg-red-100 text-red-600" };
    if (riskPercent >= DASH_WARNING_THRESHOLD) return { label: "Warning", badge: "bg-orange-100 text-orange-700" };
    return { label: "Low Risk", badge: "bg-emerald-100 text-emerald-700" };
  }

  return { label: "Not scanned", badge: "bg-slate-100 text-slate-600" };
};

export const dashRiskPercent = (batch) => {
  if (isExpiredYMD(batch.expiryDate) && batch.quantity > 0) return 100;

  const raw =
    batch.lastRiskProbability ??
    batch.lastRiskPercent ??
    batch.expiryRiskProbability ??
    batch.expiry_risk_probability;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;

  const percent = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(percent)));
};

export const dashLossPreventionAction = (batch) => {
  if (batch?.quantity > 0 && batch?.expiryDate && isExpiredYMD(batch.expiryDate)) {
    return {
      label: "Log waste",
      to: `/admin?batch=${batch.id}&intent=waste#dashboard-ai-expiry-risk`,
      title: "Open this expired batch inside the dashboard AI Expiry Risk section and record waste.",
    };
  }

  return {
    label: "Open AI Risk",
    to: `/admin?batch=${batch.id}#dashboard-ai-expiry-risk`,
    title: "Open this batch inside the dashboard AI Expiry Risk section.",
  };
};

