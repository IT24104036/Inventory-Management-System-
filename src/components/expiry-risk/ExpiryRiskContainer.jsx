import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import {
    getBatches,
    getProducts,
    getWasteHistory,
    getWasteLoggedBatchIds,
    predictAllBatches,
    predictExpiryRisk,
    predictExpiryRiskFromBatch,
    recordBatchWaste,
} from "@/lib/api";
import { runWithState } from "@/lib/asyncState";
import {
    AutomatedRiskTab,
    ExpiryRiskHeader,
    ExpiryRiskTabList,
    InlineError,
    ManualRiskTab,
    RiskResultPanel,
    WasteHistorySection,
    WasteRecordDialog,
} from "./ExpiryRiskSections";
import { defaultForm, getErrorMessage, isExpired } from "./expiryRiskUtils";

let lastExpiryDeepLinkKeyConsumed = null;
const AUTO_REFRESH_MS = 300000;

export default function ExpiryRiskContainer({ embedded = false }) {
    const [searchParams, setSearchParams] = useSearchParams();
    const [mode, setMode] = useState("automated");
    const [form, setForm] = useState(defaultForm);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingBatchId, setLoadingBatchId] = useState(null);
    const [runningAll, setRunningAll] = useState(false);
    const [runAllDone, setRunAllDone] = useState(false);
    const [error, setError] = useState("");
    const [batches, setBatches] = useState([]);
    const [fetchingBatches, setFetchingBatches] = useState(false);
    const [wasteBatch, setWasteBatch] = useState(null);
    const [wasteQtyStr, setWasteQtyStr] = useState("1");
    const [wasteNotes, setWasteNotes] = useState("");
    const [wasteReason, setWasteReason] = useState("EXPIRED_DISPOSAL");
    const [wasteSaving, setWasteSaving] = useState(false);
    const [wasteError, setWasteError] = useState("");
    const [wasteHistory, setWasteHistory] = useState([]);
    const [wasteHistoryLoading, setWasteHistoryLoading] = useState(false);
    const [wasteHistoryError, setWasteHistoryError] = useState("");
    const [whFrom, setWhFrom] = useState("");
    const [whTo, setWhTo] = useState("");
    const [whProductId, setWhProductId] = useState("");
    const [whCategory, setWhCategory] = useState("");
    const [whBatchId, setWhBatchId] = useState("");
    const [whReason, setWhReason] = useState("");
    const [whProducts, setWhProducts] = useState([]);
    const [loggedBatchIds, setLoggedBatchIds] = useState(() => new Set());
    const [deepLinkCoach, setDeepLinkCoach] = useState(null);
    const prevBatchFocusIdRef = useRef(null);
    const autoRunStartedRef = useRef(false);
    const runningAllRef = useRef(false);

    const batchFocusId = searchParams.get("batch");
    const deepLinkIntent = searchParams.get("intent");

    const wasteFilterSetters = {
        whFrom: setWhFrom,
        whTo: setWhTo,
        whProductId: setWhProductId,
        whCategory: setWhCategory,
        whBatchId: setWhBatchId,
        whReason: setWhReason,
    };

    useEffect(() => {
        if (mode === "automated") {
            void loadBatches();
        }
    }, [mode]);

    useEffect(() => {
        runningAllRef.current = runningAll;
    }, [runningAll]);

    useEffect(() => {
        if (mode !== "automated") return undefined;

        if (!autoRunStartedRef.current) {
            autoRunStartedRef.current = true;
            window.setTimeout(() => {
                if (!runningAllRef.current) {
                    void handleRunAll({ silent: true });
                }
            }, 800);
        }

        const intervalId = window.setInterval(() => {
            if (!runningAllRef.current) {
                void handleRunAll({ silent: true });
            }
        }, AUTO_REFRESH_MS);

        return () => window.clearInterval(intervalId);
    }, [mode]);

    useEffect(() => {
        if (prevBatchFocusIdRef.current !== batchFocusId) {
            lastExpiryDeepLinkKeyConsumed = null;
            prevBatchFocusIdRef.current = batchFocusId;
        }
    }, [batchFocusId]);

    useEffect(() => {
        if (!batchFocusId || batches.length === 0 || fetchingBatches) return;
        const key = `${batchFocusId}:${deepLinkIntent || ""}`;
        if (lastExpiryDeepLinkKeyConsumed === key) return;

        const batch = batches.find((row) => String(row.id) === String(batchFocusId));
        if (!batch) return;

        const element = document.getElementById(`expiry-batch-row-${batchFocusId}`);
        if (!element) return;

        lastExpiryDeepLinkKeyConsumed = key;
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-2", "ring-[#7C3AED]", "ring-offset-2");

        if (deepLinkIntent === "waste") {
            if (isExpired(batch.expiryDate) && batch.quantity > 0) {
                setDeepLinkCoach(null);
                window.setTimeout(() => setWasteBatch(batch), 380);
            } else {
                setDeepLinkCoach(
                    !batch.quantity
                        ? "No stock left on this batch - nothing to waste-log."
                        : "This batch is not past expiry - use Re-predict to refresh the AI score, or manage pricing under Discounts & Alerts."
                );
            }
        } else if (!isExpired(batch.expiryDate) && batch.quantity > 0) {
            setDeepLinkCoach("Next step: run Re-predict on this row to refresh the model with current stock. Use Discounts & Alerts if you need a markdown.");
        } else if (isExpired(batch.expiryDate) && batch.quantity > 0) {
            setDeepLinkCoach("This batch is expired - use Record waste on this row to write off remaining units (or open Log waste from the dashboard).");
        } else {
            setDeepLinkCoach(null);
        }

        const timeoutId = window.setTimeout(() => {
            element.classList.remove("ring-2", "ring-[#7C3AED]", "ring-offset-2");
            lastExpiryDeepLinkKeyConsumed = null;
            setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete("batch");
                next.delete("intent");
                return next;
            }, { replace: true });
        }, 5000);

        return () => window.clearTimeout(timeoutId);
    }, [batchFocusId, batches, deepLinkIntent, fetchingBatches, setSearchParams]);

    useEffect(() => {
        if (!wasteBatch) return;
        const max = wasteBatch.quantity != null ? wasteBatch.quantity : 0;
        setWasteQtyStr(String(max > 0 ? max : 1));
        setWasteNotes("");
        setWasteReason("EXPIRED_DISPOSAL");
        setWasteError("");
    }, [wasteBatch]);

    useEffect(() => {
        getWasteLoggedBatchIds()
            .then((ids) => setLoggedBatchIds(new Set(Array.isArray(ids) ? ids : [])))
            .catch(() => setLoggedBatchIds(new Set()));
    }, []);

    useEffect(() => {
        if (mode !== "waste_history") return;
        getProducts()
            .then((data) => setWhProducts(Array.isArray(data) ? data : []))
            .catch(() => setWhProducts([]));
    }, [mode]);

    const loadBatches = async () => {
        const data = await runWithState({
            setLoading: setFetchingBatches,
            setError,
            task: getBatches,
            getErrorMessage: (err) => `Failed to load inventory batches. ${getErrorMessage(err, "Unknown error.")}`,
        });
        if (data) setBatches(data);
    };

    const loadWasteHistory = async () => {
        const batchId = whBatchId.trim();
        const productId = whProductId.trim();
        const data = await runWithState({
            setLoading: setWasteHistoryLoading,
            setError: setWasteHistoryError,
            task: () => getWasteHistory({
                from: whFrom || undefined,
                to: whTo || undefined,
                batchId: batchId && Number.isFinite(Number(batchId)) ? Number(batchId) : undefined,
                productId: productId && Number.isFinite(Number(productId)) ? Number(productId) : undefined,
                category: whCategory || undefined,
                reasonCode: whReason || undefined,
            }),
            getErrorMessage: (err) => getErrorMessage(err, "Failed to load waste history."),
        });
        if (data) setWasteHistory(data);
    };

    const getCategoryDefaults = (category) => {
        const normalized = String(category || "").toLowerCase();
        if (normalized.includes("dairy")) return { shelfLifeDays: 14, spoilageSensitivity: 0.8 };
        if (normalized.includes("produce") || normalized.includes("ready")) return { shelfLifeDays: 10, spoilageSensitivity: 0.75 };
        if (normalized.includes("meat") || normalized.includes("seafood")) return { shelfLifeDays: 7, spoilageSensitivity: 0.85 };
        if (normalized.includes("bakery")) return { shelfLifeDays: 21, spoilageSensitivity: 0.45 };
        if (normalized.includes("frozen")) return { shelfLifeDays: 90, spoilageSensitivity: 0.35 };
        if (normalized.includes("pharma")) return { shelfLifeDays: 365, spoilageSensitivity: 0.25 };
        if (normalized.includes("beverage")) return { shelfLifeDays: 120, spoilageSensitivity: 0.3 };
        return { shelfLifeDays: 30, spoilageSensitivity: 0.5 };
    };

    const handleManualPredict = async (event) => {
        event.preventDefault();
        setError("");
        setResult(null);

        for (const key of ["category", "days_until_expiry", "remaining_quantity", "daily_demand"]) {
            if (form[key] === "" || form[key] == null) {
                setError(`Please fill in "${key.replace(/_/g, " ")}".`);
                return;
            }
        }

        setLoading(true);
        try {
            const daysUntilExpiry = Number.parseFloat(form.days_until_expiry);
            const remainingQuantity = Number.parseFloat(form.remaining_quantity);
            const dailyDemand = Number.parseFloat(form.daily_demand);
            const unitsSold = form.units_sold === "" ? 0 : Number.parseFloat(form.units_sold);
            if (![daysUntilExpiry, remainingQuantity, dailyDemand, unitsSold].every(Number.isFinite)) {
                setError("Please enter valid numbers before running the prediction.");
                return;
            }
            if (daysUntilExpiry < 0 || remainingQuantity < 0 || dailyDemand < 0 || unitsSold < 0) {
                setError("Values cannot be negative. Use 0 if there are no sales or no stock.");
                return;
            }
            const inferredInitialQuantity = remainingQuantity + Math.max(unitsSold, 0);
            const initialQuantity = form.initial_quantity === ""
                ? inferredInitialQuantity
                : Math.max(Number.parseFloat(form.initial_quantity), inferredInitialQuantity);
            const categoryDefaults = getCategoryDefaults(form.category);
            const inferredDaysSinceArrival = dailyDemand > 0 ? Math.ceil(unitsSold / dailyDemand) : 0;
            const shelfLifeDays = form.shelf_life_days === ""
                ? Math.max(daysUntilExpiry + inferredDaysSinceArrival, categoryDefaults.shelfLifeDays, 1)
                : Number.parseFloat(form.shelf_life_days);
            const stockPressureRatio = remainingQuantity / Math.max(dailyDemand, 1);
            const payload = {
                days_until_expiry: daysUntilExpiry,
                days_to_expiry_at_arrival: shelfLifeDays,
                initial_quantity: initialQuantity,
                shelf_life_days: shelfLifeDays,
                units_sold: unitsSold,
                remaining_quantity: remainingQuantity,
                daily_demand: dailyDemand,
                average_daily_sales: dailyDemand,
                sell_through_rate: initialQuantity > 0 ? unitsSold / initialQuantity : 0,
                stock_pressure_ratio: stockPressureRatio,
                velocity_score: dailyDemand / Math.max(shelfLifeDays, 1),
                expiry_pressure_index: stockPressureRatio / (daysUntilExpiry + 1),
                category: form.category,
                is_weekend: Number.parseInt(form.is_weekend, 10),
                month: Number.parseInt(form.month, 10),
                sales_volatility: Number.parseFloat(form.demand_variability) || 0.3,
                demand_variability: Number.parseFloat(form.demand_variability) || 0.3,
                spoilage_sensitivity: Number.parseFloat(form.spoilage_sensitivity) || categoryDefaults.spoilageSensitivity,
            };
            setResult(await predictExpiryRisk(payload));
        } catch (err) {
            setError(getErrorMessage(err, "Prediction failed. Make sure both Spring Boot and the ML server are running."));
        } finally {
            setLoading(false);
        }
    };

    const handleBatchPredict = async (batchId) => {
        setError("");
        setResult(null);
        setLoadingBatchId(batchId);
        try {
            const data = await predictExpiryRiskFromBatch(batchId);
            setResult(data);
            setBatches((prev) => prev.map((batch) => (
                batch.id === batchId
                    ? { ...batch, lastRiskLabel: data.risk_label, lastRiskProbability: data.expiry_risk_probability, impactScore: data.impact_score ?? batch.impactScore ?? null, lastPredictedAt: new Date().toISOString() }
                    : batch
            )));
        } catch (err) {
            setError(getErrorMessage(err, "Prediction failed. Make sure both Spring Boot and the ML server are running."));
        } finally {
            setLoadingBatchId(null);
        }
    };

    const handleRunAll = async ({ silent = false } = {}) => {
        setError("");
        if (!silent) {
            setResult(null);
        }
        setRunningAll(true);
        if (!silent) {
            setRunAllDone(false);
        }
        try {
            await predictAllBatches();
            await loadBatches();
            if (!silent) {
                setRunAllDone(true);
                window.setTimeout(() => setRunAllDone(false), 3000);
            }
        } catch (err) {
            setError(getErrorMessage(err, "Bulk prediction failed. Make sure both Spring Boot and the ML server are running."));
        } finally {
            setRunningAll(false);
        }
    };

    const handleViewBatchResult = (batch) => {
        if (!batch) return;
        const probability = Number(batch.lastRiskProbability ?? 0);
        const safeProbability = Number.isFinite(probability) ? Math.max(0, Math.min(1, probability)) : 0;
        const suggestedDiscountPct = safeProbability > 0.7 ? 30 : safeProbability >= 0.4 ? 15 : 0;
        setResult({
            expiry_risk_probability: safeProbability,
            sell_through_before_expiry_probability: Math.max(0, Math.min(1, 1 - safeProbability)),
            suggested_discount_pct: suggestedDiscountPct,
            predicted_label: safeProbability >= 0.4 ? 1 : 0,
            risk_label: batch.lastRiskLabel || (safeProbability >= 0.4 ? "Warning" : "Low Risk"),
            suggested_action: batch.lastRiskLabel === "High Risk"
                ? "Show alert and suggest 30% discount"
                : batch.lastRiskLabel === "Warning"
                    ? "Monitor closely and consider 15% discount"
                    : "No immediate action from the latest saved AI scan",
            impact_score: batch.impactScore ?? null,
            decision_threshold: 0.4,
            prediction_source: "SAVED_BATCH_RESULT",
        });
    };

    const handleRecordWaste = async (event) => {
        event.preventDefault();
        if (!wasteBatch) return;
        const maxQuantity = wasteBatch.quantity ?? 0;
        const quantity = Number.parseInt(wasteQtyStr, 10);
        setWasteError("");

        if (!Number.isFinite(quantity) || quantity < 1 || quantity > maxQuantity) {
            setWasteError(`Enter a whole number between 1 and ${maxQuantity}.`);
            return;
        }

        setWasteSaving(true);
        try {
            await recordBatchWaste(wasteBatch.id, { quantity, notes: wasteNotes, reasonCode: wasteReason });
            setLoggedBatchIds((prev) => new Set([...prev, wasteBatch.id]));
            setWasteBatch(null);
            await loadBatches();
            if (mode === "waste_history") {
                await loadWasteHistory();
            }
        } catch (err) {
            setWasteError(getErrorMessage(err, "Could not record waste."));
        } finally {
            setWasteSaving(false);
        }
    };

    const clearWasteFilters = async () => {
        setWhFrom("");
        setWhTo("");
        setWhProductId("");
        setWhCategory("");
        setWhBatchId("");
        setWhReason("");
        const data = await runWithState({
            setLoading: setWasteHistoryLoading,
            setError: setWasteHistoryError,
            task: () => getWasteHistory({}),
            getErrorMessage: (err) => getErrorMessage(err, "Failed to load waste history."),
        });
        if (data) setWasteHistory(data);
    };

    const exportWasteCsv = () => {
        if (!wasteHistory.length) return;
        const headers = ["recordedAt", "productName", "productCategory", "batchId", "batchNumber", "reasonCode", "quantityWasted", "costLoss", "notes"];
        const escapeValue = (value) => {
            const stringValue = value == null ? "" : String(value);
            return /[",\n\r]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
        };
        const lines = [`\uFEFF${headers.join(",")}`];
        for (const row of wasteHistory) {
            lines.push(headers.map((header) => escapeValue(row[header])).join(","));
        }
        const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `waste-history-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const setField = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
    const setFieldValue = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
    const handleWasteFilterChange = (key, value) => wasteFilterSetters[key]?.(value);
    const handleReset = () => { setForm(defaultForm); setResult(null); setError(""); };
    const handlePreset = (preset) => {
        const presets = {
            milk: {
                category: "Dairy",
                days_until_expiry: "3",
                remaining_quantity: "245",
                units_sold: "1430",
                daily_demand: "38.2",
                shelf_life_days: "14",
                demand_variability: "0.25",
                spoilage_sensitivity: "0.8",
            },
            biscuits: {
                category: "Bakery",
                days_until_expiry: "68",
                remaining_quantity: "42",
                units_sold: "1850",
                daily_demand: "28.4",
                shelf_life_days: "90",
                demand_variability: "0.18",
                spoilage_sensitivity: "0.25",
            },
        };
        setForm({ ...defaultForm, ...(presets[preset] || {}) });
        setResult(null);
        setError("");
    };
    const openWasteHistory = () => { setMode("waste_history"); void loadWasteHistory(); };
    const expiredWithStock = batches.filter((batch) => batch.quantity > 0 && isExpired(batch.expiryDate)).length;
    const scannedBatches = batches.filter((batch) => Boolean(batch.lastRiskLabel)).length;
    const flaggedBatches = batches.filter((batch) => (
        batch.lastRiskLabel === "High Risk" || batch.lastRiskLabel === "Warning"
    )).length;
    const totalWasteCost = wasteHistory.reduce((sum, row) => sum + (row.costLoss || 0), 0);
    const totalWasteUnits = wasteHistory.reduce((sum, row) => sum + (row.quantityWasted || 0), 0);

    return (
        <div className={embedded ? "space-y-6" : "space-y-8"}>
            {!embedded ? (
                <ExpiryRiskHeader
                    stats={{
                        activeBatches: batches.length,
                        flaggedBatches,
                        expiredWithStock,
                        scannedBatches,
                    }}
                />
            ) : null}
            <Tabs
                value={mode}
                onValueChange={(nextMode) => {
                    setMode(nextMode);
                    setResult(null);
                    setError("");
                    if (nextMode === "waste_history") {
                        void loadWasteHistory();
                    }
                }}
                className="w-full"
            >
                <ExpiryRiskTabList embedded={embedded} />
                <div className={mode === "waste_history" ? "" : `grid items-start ${embedded ? "gap-6" : "gap-8"} 2xl:grid-cols-[minmax(0,1fr)_minmax(340px,400px)]`}>
                    <div className="min-w-0 space-y-6">
                        <AutomatedRiskTab
                            batches={batches}
                            deepLinkCoach={deepLinkCoach}
                            expiredWithStock={expiredWithStock}
                            fetchingBatches={fetchingBatches}
                            loadingBatchId={loadingBatchId}
                            loggedBatchIds={loggedBatchIds}
                            runAllDone={runAllDone}
                            runningAll={runningAll}
                            embedded={embedded}
                            summary={{
                                activeBatches: batches.length,
                                flaggedBatches,
                                scannedBatches,
                            }}
                            onDismissCoach={() => setDeepLinkCoach(null)}
                            onPredictBatch={handleBatchPredict}
                            onRecordWaste={setWasteBatch}
                            onRefresh={loadBatches}
                            onRunAll={handleRunAll}
                            onViewBatchResult={handleViewBatchResult}
                            onViewHistory={openWasteHistory}
                        />
                        <ManualRiskTab
                            embedded={embedded}
                            form={form}
                            loading={loading}
                            onFieldChange={setField}
                            onFieldValueChange={setFieldValue}
                            onPreset={handlePreset}
                            onReset={handleReset}
                            onSubmit={handleManualPredict}
                        />
                        <InlineError error={error} />
                        <TabsContent value="waste_history" className="m-0 outline-none" />
                    </div>
                    <RiskResultPanel embedded={embedded} loading={loading} mode={mode} result={result} />
                </div>
            </Tabs>

            {mode === "waste_history" ? (
                <WasteHistorySection
                    filters={{ whFrom, whTo, whProductId, whCategory, whBatchId, whReason }}
                    history={wasteHistory}
                    loading={wasteHistoryLoading}
                    error={wasteHistoryError}
                    products={whProducts}
                    totalWasteCost={totalWasteCost}
                    totalWasteUnits={totalWasteUnits}
                    onApplyFilters={loadWasteHistory}
                    onChangeFilter={handleWasteFilterChange}
                    onClearFilters={clearWasteFilters}
                    onExportCsv={exportWasteCsv}
                />
            ) : null}

            <WasteRecordDialog
                open={wasteBatch != null}
                wasteBatch={wasteBatch}
                wasteError={wasteError}
                wasteNotes={wasteNotes}
                wasteQtyStr={wasteQtyStr}
                wasteReason={wasteReason}
                wasteSaving={wasteSaving}
                onClose={() => setWasteBatch(null)}
                onNotesChange={setWasteNotes}
                onQtyChange={setWasteQtyStr}
                onReasonChange={setWasteReason}
                onSubmit={handleRecordWaste}
            />
        </div>
    );
}
