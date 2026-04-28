import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import {
    deleteDiscount,
    generateDiscountSuggestions,
    getDiscounts,
    getExpiryActionAlerts,
    getRiskSummary,
    recordBatchWaste,
    requestDiscountReview,
    updateDiscount,
} from "@/lib/api";
import { hasDiscountReviewAuthority } from "@/lib/access";
import { runWithState } from "@/lib/asyncState";
import { daysLeftUntilExpiryYMD } from "@/lib/dateUtils";
import { getSessionUser } from "@/lib/session";
import {
    AlertsAccessRestricted,
    AlertsErrorBanner,
    AlertsLoadingState,
    AlertsStatsRow,
    AlertsTabSelector,
    AlertsTableSection,
    AlertDetailDialog,
    DeleteSuggestionDialog,
    DiscountsTableSection,
    OverrideDiscountDialog,
    WasteLogDialog,
} from "./DiscountsAlertsSections";
import { getAlertsErrorMessage, getSortedDiscounts } from "./discountAlertsUtils";

let lastAlertsBatchHighlightConsumed = null;

function formatAutoScanInterval(ms) {
    const value = Number(ms);
    if (!Number.isFinite(value) || value <= 0) return "the configured schedule";
    const mins = Math.max(1, Math.round(value / 60000));
    if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"}`;
    const hours = Math.round((mins / 60) * 10) / 10;
    return `${hours} hour${hours === 1 ? "" : "s"}`;
}

export default function DiscountsAlertsContainer({ role = "Admin", canView = true, canManage = false }) {
    const { toast } = useToast();
    const [searchParams, setSearchParams] = useSearchParams();

    const isAdmin = role === "Admin";
    const sessionUser = getSessionUser();
    const canManageDiscounts = isAdmin || canManage || hasDiscountReviewAuthority(sessionUser);
    const hasAccess = isAdmin || canView || canManage;

    const [discounts, setDiscounts] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [globalError, setGlobalError] = useState("");
    const [tab, setTab] = useState("alerts");
    const [statusFilter, setStatusFilter] = useState(() => canManageDiscounts ? "all" : "ACTIVE");
    const [sortCol, setSortCol] = useState("daysLeft");
    const [sortDir, setSortDir] = useState("asc");
    const [overrideOpen, setOverrideOpen] = useState(false);
    const [overrideTarget, setOverrideTarget] = useState(null);
    const [overrideRate, setOverrideRate] = useState("");
    const [overrideErr, setOverrideErr] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [focusedDiscountId, setFocusedDiscountId] = useState(null);
    const [requestingDiscountId, setRequestingDiscountId] = useState(null);
    const [wasteTarget, setWasteTarget] = useState(null);
    const [wasteQty, setWasteQty] = useState("");
    const [wasteReason, setWasteReason] = useState("EXPIRED_DISPOSAL");
    const [wasteNotes, setWasteNotes] = useState("");
    const [wasteError, setWasteError] = useState("");
    const [wasteSaving, setWasteSaving] = useState(false);
    const [riskSummary, setRiskSummary] = useState(null);
    const [alertDetailTarget, setAlertDetailTarget] = useState(null);

    const highlightBatchFromUrl = searchParams.get("batch");
    const prevHighlightBatchRef = useRef(null);
    const autoRefreshTriggeredRef = useRef(false);

    const fetchData = async () => {
        await runWithState({
            setLoading,
            setError: setGlobalError,
            task: async () => {
                const [discountData, alertData, riskData] = await Promise.all([
                    getDiscounts(),
                    getExpiryActionAlerts(),
                    getRiskSummary(),
                ]);
                setDiscounts(Array.isArray(discountData) ? discountData : []);
                setAlerts(Array.isArray(alertData?.items) ? alertData.items : []);
                setRiskSummary(riskData || null);
            },
            getErrorMessage: (error) => getAlertsErrorMessage(
                error,
                "Could not connect to the backend. Please check your connection."
            ),
        });
    };

    useEffect(() => {
        void fetchData();
    }, []);

    useEffect(() => {
        const currentTab = searchParams.get("tab");
        if (currentTab === "discounts") setTab("discounts");
        else if (currentTab === "alerts") setTab("alerts");
    }, [searchParams]);

    useEffect(() => {
        if (prevHighlightBatchRef.current !== highlightBatchFromUrl) {
            lastAlertsBatchHighlightConsumed = null;
            prevHighlightBatchRef.current = highlightBatchFromUrl;
        }
    }, [highlightBatchFromUrl]);

    useEffect(() => {
        if (!highlightBatchFromUrl || tab !== "alerts" || loading) return undefined;

        const key = String(highlightBatchFromUrl);
        if (lastAlertsBatchHighlightConsumed === key) return undefined;

        const element = document.getElementById(`expiry-alert-row-${key}`);
        if (!element) {
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete("batch");
                return next;
            }, { replace: true });
            return undefined;
        }

        lastAlertsBatchHighlightConsumed = key;
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-2", "ring-[#7C3AED]", "ring-offset-2");

        const timeoutId = window.setTimeout(() => {
            element.classList.remove("ring-2", "ring-[#7C3AED]", "ring-offset-2");
            lastAlertsBatchHighlightConsumed = null;
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete("batch");
                next.delete("tab");
                return next;
            }, { replace: true });
        }, 4500);

        return () => window.clearTimeout(timeoutId);
    }, [highlightBatchFromUrl, loading, setSearchParams, tab]);

    useEffect(() => {
        if (tab !== "discounts" || !focusedDiscountId) return undefined;

        const element = document.getElementById(`discount-row-${focusedDiscountId}`);
        if (!element) return undefined;

        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-2", "ring-[#7C3AED]", "ring-offset-2");

        const timeoutId = window.setTimeout(() => {
            element.classList.remove("ring-2", "ring-[#7C3AED]", "ring-offset-2");
            setFocusedDiscountId(null);
        }, 2500);

        return () => window.clearTimeout(timeoutId);
    }, [focusedDiscountId, tab, discounts.length]);

    const focusDiscount = (discountId) => {
        if (!discountId) return;
        setStatusFilter("all");
        setTab("discounts");
        setFocusedDiscountId(discountId);
    };

    const openWasteDialog = (alert) => {
        setWasteTarget(alert);
        setWasteQty(String(alert?.quantity ?? ""));
        setWasteReason("EXPIRED_DISPOSAL");
        setWasteNotes("");
        setWasteError("");
    };

    const handleWasteSubmit = async (event) => {
        event.preventDefault();
        if (!wasteTarget?.batchId) return;

        const quantity = Number(wasteQty);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            setWasteError("Enter a valid waste quantity.");
            return;
        }

        if (quantity > Number(wasteTarget.quantity || 0)) {
            setWasteError("Waste quantity cannot exceed the remaining batch quantity.");
            return;
        }

        setWasteSaving(true);
        setWasteError("");
        try {
            await recordBatchWaste(wasteTarget.batchId, {
                quantity,
                reasonCode: wasteReason,
                notes: wasteNotes,
            });
            toast({
                title: "Waste recorded",
                description: `${wasteTarget.productName} ${wasteTarget.batchNumber || `Batch #${wasteTarget.batchId}`} was logged as waste.`,
            });
            setWasteTarget(null);
            await fetchData();
        } catch (error) {
            setWasteError(getAlertsErrorMessage(error, "Failed to record waste."));
        } finally {
            setWasteSaving(false);
        }
    };

    const handleRequestReview = async (alert) => {
        if (!alert?.discountId) return;

        const requestedBy = sessionUser?.name || sessionUser?.username || "Staff";
        setRequestingDiscountId(alert.discountId);
        try {
            await requestDiscountReview(alert.discountId, requestedBy);
            toast({
                title: "Manager review requested",
                description: `${alert.productName} ${alert.batchNumber || `Batch #${alert.batchId}`} is now in the manager review queue.`,
            });
            await fetchData();
        } catch (error) {
            toast({
                title: "Error",
                description: getAlertsErrorMessage(error, "Failed to request a review."),
                variant: "destructive",
            });
        } finally {
            setRequestingDiscountId(null);
        }
    };

    const handleGenerate = async ({ showToast = true } = {}) => {
        setIsGenerating(true);
        try {
            const result = await generateDiscountSuggestions();
            if (showToast) {
                toast({
                    title: "AI Predictions Refreshed",
                    description: `${result.generated} discount suggestion(s) created or updated after a fresh ML scan.`,
                });
            }
            await fetchData();
        } catch (error) {
            toast({
                title: "Error",
                description: getAlertsErrorMessage(error, "Failed to generate discount suggestions."),
                variant: "destructive",
            });
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        if (loading || isGenerating || globalError || !canManageDiscounts || autoRefreshTriggeredRef.current) {
            return;
        }

        autoRefreshTriggeredRef.current = true;
        void handleGenerate({ showToast: false });
    }, [canManageDiscounts, globalError, isGenerating, loading]);

    const handleAccept = async (discount) => {
        try {
            const updated = await updateDiscount(discount.id, {
                finalRate: discount.suggestedRate,
                status: "ACTIVE",
            });
            setDiscounts((prev) => prev.map((item) => item.id === updated.id ? updated : item));
            await fetchData();
            toast({
                title: "Discount Activated",
                description: `${discount.product?.name} - ${discount.suggestedRate}% off activated.`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: getAlertsErrorMessage(error, "Failed to activate the discount."),
                variant: "destructive",
            });
        }
    };

    const openOverride = (discount) => {
        setOverrideTarget(discount);
        setOverrideRate(discount.finalRate?.toString() ?? discount.suggestedRate?.toString() ?? "");
        setOverrideErr("");
        setOverrideOpen(true);
    };

    const handleOverride = async (event) => {
        event.preventDefault();
        const rate = Number.parseFloat(overrideRate);

        if (Number.isNaN(rate) || rate <= 0 || rate > 100) {
            setOverrideErr("Rate must be between 1 and 100.");
            return;
        }

        setIsSaving(true);
        try {
            const updated = await updateDiscount(overrideTarget.id, { finalRate: rate, status: "ACTIVE" });
            setDiscounts((prev) => prev.map((item) => item.id === updated.id ? updated : item));
            await fetchData();
            setOverrideOpen(false);
            toast({
                title: "Discount Updated",
                description: `${overrideTarget.product?.name} - ${rate}% off applied.`,
            });
        } catch (error) {
            setOverrideErr(getAlertsErrorMessage(error, "Failed to override the discount rate."));
        } finally {
            setIsSaving(false);
        }
    };

    const handleReject = async (discount) => {
        try {
            const updated = await updateDiscount(discount.id, { status: "REJECTED" });
            setDiscounts((prev) => prev.map((item) => item.id === updated.id ? updated : item));
            await fetchData();
            toast({
                title: "Discount Rejected",
                description: `Suggestion for ${discount.product?.name} rejected.`,
            });
        } catch (error) {
            toast({
                title: "Error",
                description: getAlertsErrorMessage(error, "Failed to reject the discount suggestion."),
                variant: "destructive",
            });
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;

        setIsDeleting(true);
        try {
            await deleteDiscount(deleteTarget.id);
            setDiscounts((prev) => prev.filter((item) => item.id !== deleteTarget.id));
            await fetchData();
            toast({ title: "Removed", description: "Discount suggestion removed." });
            setDeleteTarget(null);
        } catch (error) {
            toast({
                title: "Error",
                description: getAlertsErrorMessage(error, "Failed to remove the discount suggestion."),
                variant: "destructive",
            });
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSort = (column) => {
        if (sortCol === column) {
            setSortDir((current) => current === "asc" ? "desc" : "asc");
            return;
        }
        setSortCol(column);
        setSortDir("asc");
    };

    const enrichedDiscounts = discounts.map((discount) => ({
        ...discount,
        daysLeft: discount.batch?.expiryDate ? daysLeftUntilExpiryYMD(discount.batch.expiryDate) : null,
    }));

    const filteredDiscounts = getSortedDiscounts(enrichedDiscounts, statusFilter, sortCol, sortDir);
    const activeDiscounts = discounts.filter((discount) => discount.status === "ACTIVE").length;
    const pendingDiscounts = discounts.filter((discount) => discount.status === "PENDING").length;
    const criticalAlerts = alerts.filter((alert) => alert.riskLevel === "High Risk" || alert.riskLevel === "Expired").length;
    const autoRunText = riskSummary?.autoScanEnabled
        ? `Auto-generates after each AI scan, about every ${formatAutoScanInterval(riskSummary.autoScanIntervalMs)}.`
        : "Automatic suggestion generation is off.";

    if (!hasAccess) {
        return <AlertsAccessRestricted />;
    }

    return (
        <div className="space-y-8">
            <AlertsStatsRow
                alertsCount={alerts.length}
                criticalAlerts={criticalAlerts}
                activeDiscounts={activeDiscounts}
                pendingDiscounts={pendingDiscounts}
            />

            <AlertsErrorBanner error={globalError} onRetry={fetchData} />

            <AlertsTabSelector
                tab={tab}
                alertsCount={alerts.length}
                pendingDiscounts={pendingDiscounts}
                onChange={setTab}
            />

            {loading ? (
                <AlertsLoadingState />
            ) : (
                <>
                    {tab === "alerts" ? (
                        <AlertsTableSection
                            alerts={alerts}
                            canManageDiscounts={canManageDiscounts}
                            autoRunText={autoRunText}
                            isRefreshing={isGenerating}
                            requestingDiscountId={requestingDiscountId}
                            onFocusDiscount={focusDiscount}
                            onRefresh={handleGenerate}
                            onRequestReview={handleRequestReview}
                            onRecordWaste={openWasteDialog}
                            onViewAlert={setAlertDetailTarget}
                        />
                    ) : null}

                    {tab === "discounts" ? (
                        <DiscountsTableSection
                            canManageDiscounts={canManageDiscounts}
                            filteredDiscounts={filteredDiscounts}
                            isGenerating={isGenerating}
                            sortCol={sortCol}
                            sortDir={sortDir}
                            statusFilter={statusFilter}
                            autoRunText={autoRunText}
                            onAccept={handleAccept}
                            onDelete={setDeleteTarget}
                            onGenerate={handleGenerate}
                            onOverride={openOverride}
                            onReject={handleReject}
                            onSort={handleSort}
                            onStatusFilterChange={setStatusFilter}
                        />
                    ) : null}
                </>
            )}

            <OverrideDiscountDialog
                error={overrideErr}
                isOpen={overrideOpen}
                isSaving={isSaving}
                overrideRate={overrideRate}
                target={overrideTarget}
                onClose={setOverrideOpen}
                onOverrideRateChange={setOverrideRate}
                onSubmit={handleOverride}
            />

            <WasteLogDialog
                error={wasteError}
                isOpen={!!wasteTarget}
                notes={wasteNotes}
                quantity={wasteQty}
                reason={wasteReason}
                saving={wasteSaving}
                target={wasteTarget}
                onClose={() => setWasteTarget(null)}
                onNotesChange={setWasteNotes}
                onQuantityChange={setWasteQty}
                onReasonChange={setWasteReason}
                onSubmit={handleWasteSubmit}
            />

            <AlertDetailDialog
                alert={alertDetailTarget}
                canManageDiscounts={canManageDiscounts}
                requestingDiscountId={requestingDiscountId}
                onClose={() => setAlertDetailTarget(null)}
                onFocusDiscount={(discountId) => {
                    setAlertDetailTarget(null);
                    focusDiscount(discountId);
                }}
                onRecordWaste={(alert) => {
                    setAlertDetailTarget(null);
                    openWasteDialog(alert);
                }}
                onRequestReview={async (alert) => {
                    await handleRequestReview(alert);
                    setAlertDetailTarget(null);
                }}
            />

            <DeleteSuggestionDialog
                isDeleting={isDeleting}
                target={deleteTarget}
                onCancel={() => setDeleteTarget(null)}
                onConfirm={handleDelete}
            />
        </div>
    );
}
