import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { getBatches, getDiscounts } from "@/lib/api";
import {
    finalizeDraft,
    getProducts,
    getSalesHistory,
    recordPosSale,
    unvoidSale,
    updateBill,
    voidSale,
} from "@/lib/salesApi";
import { getSessionUser } from "@/lib/session";
import {
    BillDetailsDialog,
    FullBillEditDialog,
    PosFormCard,
    ProductPickerDialog,
    SalesHistoryCard,
    SalesOversightCard,
    SalesSummaryCards,
    UnvoidSaleDialog,
    VoidSaleDialog,
} from "./SalesSections";
import {
    buildBatchSnapshot,
    buildEditableBatchSnapshot,
    buildDiscountMap,
    buildExpiredStockMap,
    buildStockMap,
    canEditSale,
    createAccess,
    getEditTimeLeft,
    getEffectiveBatchDiscount,
    getSnapshotAvailableQuantity,
    getQuickPickAmounts,
    isEditWindowExpired,
    localTodayYmd,
    simulatePricing,
} from "./salesUtils";

export default function SalesContainer({ role, canEdit = false, canManageSales = false }) {
    const { toast } = useToast();
    const access = createAccess(role, canEdit, canManageSales);
    const isAdmin = access.isAdmin;
    const isManager = access.isManager;
    const currentUser = getSessionUser();

    const [products, setProducts] = useState([]);
    const [sales, setSales] = useState([]);
    const [batches, setBatches] = useState([]);
    const [stockMap, setStockMap] = useState({});
    const [expiredStockMap, setExpiredStockMap] = useState({});
    const [discountMap, setDiscountMap] = useState({});
    const [items, setItems] = useState([{ id: "1", productId: "", quantity: "" }]);
    const [amountGiven, setAmountGiven] = useState("");
    const [saleDate] = useState(localTodayYmd());
    const [notes, setNotes] = useState("");
    const [customerName, setCustomerName] = useState("");
    const [customerEmail, setCustomerEmail] = useState("");
    const [sendReceipt, setSendReceipt] = useState(false);
    const [saleSubmitting, setSaleSubmitting] = useState(false);
    const [productPickerOpen, setProductPickerOpen] = useState(false);
    const [productPickerLineId, setProductPickerLineId] = useState(null);
    const [productPickerMode, setProductPickerMode] = useState("pos");
    const [productPickerSearch, setProductPickerSearch] = useState("");
    const [voidDialogOpen, setVoidDialogOpen] = useState(false);
    const [voidTargetIds, setVoidTargetIds] = useState([]);
    const [voidReason, setVoidReason] = useState("");
    const [voidReasonError, setVoidReasonError] = useState("");
    const [voidSaving, setVoidSaving] = useState(false);
    const [unvoidDialogOpen, setUnvoidDialogOpen] = useState(false);
    const [unvoidTarget, setUnvoidTarget] = useState(null);
    const [unvoidReason, setUnvoidReason] = useState("");
    const [unvoidReasonError, setUnvoidReasonError] = useState("");
    const [unvoidSaving, setUnvoidSaving] = useState(false);
    const [billOpen, setBillOpen] = useState(false);
    const [selectedBillId, setSelectedBillId] = useState(null);
    const [fullEditOpen, setFullEditOpen] = useState(false);
    const [editBillGroupId, setEditBillGroupId] = useState(null);
    const [editBillItems, setEditBillItems] = useState([{ id: "1", productId: "", quantity: "" }]);
    const [editBillDate, setEditBillDate] = useState(localTodayYmd());
    const [editBillNotes, setEditBillNotes] = useState("");
    const [editBillCustomerName, setEditBillCustomerName] = useState("");
    const [editBillCustomerEmail, setEditBillCustomerEmail] = useState("");
    const [editBillReason, setEditBillReason] = useState("");
    const [editBillSaving, setEditBillSaving] = useState(false);
    const [editBillOriginalQty, setEditBillOriginalQty] = useState({});
    const [salesTab, setSalesTab] = useState("mine");
    const [filterSearch, setFilterSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("ALL");
    const [filterDateFrom, setFilterDateFrom] = useState("");
    const [filterDateTo, setFilterDateTo] = useState("");
    const [filterDateError, setFilterDateError] = useState("");
    const [sortBy, setSortBy] = useState("NEWEST");
    const [now, setNow] = useState(Date.now());
    const [finalizingBillId, setFinalizingBillId] = useState(null);

    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 30000);
        return () => clearInterval(timer);
    }, []);

    const refreshData = useCallback(async () => {
        try {
            const [fetchedProducts, fetchedSales, fetchedDiscounts, fetchedBatches] = await Promise.all([
                getProducts(),
                getSalesHistory(),
                getDiscounts(),
                getBatches(),
            ]);
            setProducts(fetchedProducts);
            setSales(fetchedSales);
            setBatches(fetchedBatches);
            setDiscountMap(buildDiscountMap(fetchedDiscounts));
            setStockMap(buildStockMap(fetchedBatches));
            setExpiredStockMap(buildExpiredStockMap(fetchedBatches));
        } catch (error) {
            toast({ title: "Error loading data", description: error.message, variant: "destructive" });
        }
    }, [toast]);

    useEffect(() => {
        void refreshData();
    }, [refreshData]);

    const productsById = products.reduce((acc, product) => {
        acc[String(product.id)] = product;
        return acc;
    }, {});

    const getItemCurrentStock = (productId) => stockMap[String(productId)] || 0;
    const getExpiredItemStock = (productId) => expiredStockMap[String(productId)] || 0;
    const getProductById = (id) => productsById[String(id)];

    const getNextFefoDiscountInfo = (productId) => {
        const snapshot = buildBatchSnapshot(batches);
        const nextBatch = (snapshot[String(productId)] || []).find((batch) => batch.quantity > 0);
        if (!nextBatch) return null;
        const rate = getEffectiveBatchDiscount(nextBatch.id, discountMap);
        if (rate <= 0) return null;
        return {
            rate,
            quantity: nextBatch.quantity,
            batchLabel: nextBatch.batchNumber || `Batch #${nextBatch.id}`,
        };
    };

    const pricingPreview = simulatePricing({
        sourceItems: items,
        baseBatches: batches,
        discountMap,
        productsById,
    });
    const lineTotals = pricingPreview.lineTotals;
    const billTotal = pricingPreview.total;
    const editBillActiveLines = editBillGroupId
        ? sales.filter((sale) => (sale.saleGroupId ?? String(sale.id)) === String(editBillGroupId) && sale.status === "ACTIVE")
        : [];
    const editBillBatchSnapshot = buildEditableBatchSnapshot(batches, editBillActiveLines);
    const editBillPricingPreview = simulatePricing({
        sourceItems: editBillItems,
        batchSnapshot: editBillBatchSnapshot,
        discountMap,
        productsById,
    });
    const getEditableBillStock = (productId) => getSnapshotAvailableQuantity(editBillBatchSnapshot, productId);

    const amountGivenNum = parseFloat(amountGiven);
    const maxReasonablePayment = billTotal > 0 ? Math.ceil(billTotal / 5000) * 5000 : 5000;
    const quickPickAmounts = getQuickPickAmounts(billTotal);
    const amountGivenOk = amountGiven !== "" && !Number.isNaN(amountGivenNum) && amountGivenNum >= billTotal && amountGivenNum <= maxReasonablePayment;
    const isFormValid = saleDate !== ""
        && amountGivenOk
        && items.some((item) => item.productId && typeof item.quantity === "number" && item.quantity > 0)
        && items.every((item) => {
            if (!item.productId || typeof item.quantity !== "number" || item.quantity <= 0) return true;
            return item.quantity <= getItemCurrentStock(item.productId);
        });

    const todaySales = sales.filter((sale) =>
        sale.saleDate === localTodayYmd()
        && sale.status === "ACTIVE"
        && (isManager || sale.recordedBy === currentUser.username)
    );
    const todayCount = [...new Set(todaySales.map((sale) => sale.saleGroupId))].length;
    const todayQuantity = todaySales.reduce((sum, sale) => sum + sale.quantitySold, 0);

    let displaySales = [...sales].filter((sale) => {
        if (salesTab === "mine" && sale.recordedBy !== currentUser.username) return false;
        if (filterStatus === "EDITED") return !!sale.lastEditedBy && sale.status === "ACTIVE";
        if (filterStatus !== "ALL" && sale.status !== filterStatus) return false;
        if (filterDateFrom && sale.saleDate < filterDateFrom) return false;
        if (filterDateTo && sale.saleDate > filterDateTo) return false;
        if (filterSearch && !sale.productName.toLowerCase().includes(filterSearch.toLowerCase())) return false;
        return true;
    });
    displaySales.sort((a, b) => {
        if (sortBy === "NEWEST") return new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime() || b.id - a.id;
        if (sortBy === "PRODUCT") return a.productName.localeCompare(b.productName);
        if (sortBy === "QUANTITY") return b.quantitySold - a.quantitySold;
        return 0;
    });

    const canEditThisSaleRecord = (sale) => canEditSale({
        sale,
        isManager,
        canEdit,
        currentUsername: currentUser.username,
        now,
    });
    const editWindowExpired = (sale) => isEditWindowExpired({
        sale,
        isManager,
        canEdit,
        now,
    });
    const getEditWindowText = (sale) => getEditTimeLeft({
        sale,
        isManager,
        canEdit,
        currentUsername: currentUser.username,
        now,
    });

    const handleFilterDateFromChange = (value) => {
        setFilterDateFrom(value);
        if (filterDateTo && value && value > filterDateTo) {
            setFilterDateError("Start date cannot be after end date.");
        } else {
            setFilterDateError("");
        }
    };

    const handleFilterDateToChange = (value) => {
        setFilterDateTo(value);
        if (filterDateFrom && value && value < filterDateFrom) {
            setFilterDateError("End date cannot be before start date.");
        } else {
            setFilterDateError("");
        }
    };

    const clearFilters = () => {
        setFilterSearch("");
        setFilterStatus("ALL");
        setFilterDateFrom("");
        setFilterDateTo("");
        setFilterDateError("");
        setSortBy("NEWEST");
    };

    const openProductPicker = (lineId, mode) => {
        setProductPickerLineId(lineId);
        setProductPickerMode(mode);
        setProductPickerSearch("");
        setProductPickerOpen(true);
    };

    const handlePickProduct = (productId) => {
        const value = String(productId);
        if (productPickerMode === "pos") {
            setItems((prev) => prev.map((item) => item.id === productPickerLineId ? { ...item, productId: value, quantity: "" } : item));
        } else {
            setEditBillItems((prev) => prev.map((item) => item.id === productPickerLineId ? { ...item, productId: value, quantity: "" } : item));
        }
        setProductPickerOpen(false);
    };

    const buildPayloadItems = () => items
        .filter((item) => item.productId && typeof item.quantity === "number" && item.quantity > 0)
        .map((item) => ({ productId: parseInt(item.productId, 10), quantity: item.quantity }));

    const createClientRequestKey = () => `sale-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    const executeRecordSale = async (payload) => {
        await recordPosSale(payload);
        toast({
            title: payload.asDraft ? "Draft Saved" : "Sale Recorded Successfully",
            description: payload.asDraft
                ? "Bill saved as draft. Finalize it to deduct stock."
                : `POS bill captured with ${payload.items.length} line item(s).`,
        });
        setItems([{ id: "1", productId: "", quantity: "" }]);
        setAmountGiven("");
        setNotes("");
        setCustomerName("");
        setCustomerEmail("");
        setSendReceipt(false);
        await refreshData();
    };

    const handleRecordSale = async (event, asDraft = false) => {
        event.preventDefault();
        if (!isFormValid || saleSubmitting) return;
        const sessionUser = getSessionUser();
        const user = sessionUser.username || (isAdmin ? "admin" : "staff");
        const payload = {
            saleDate,
            recordedBy: user,
            notes,
            items: buildPayloadItems(),
            customerName: customerName.trim() || null,
            customerEmail: sendReceipt && customerEmail.trim() ? customerEmail.trim() : null,
            clientRequestKey: createClientRequestKey(),
            asDraft,
        };

        if (saleDate > localTodayYmd()) {
            toast({ title: "Invalid Date", description: "Sale date cannot be in the future.", variant: "destructive" });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (sendReceipt && customerEmail.trim() && !emailRegex.test(customerEmail.trim())) {
            toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
            return;
        }

        try {
            setSaleSubmitting(true);
            await executeRecordSale(payload);
        } catch (error) {
            toast({ title: "Error Recording Sale", description: error.message, variant: "destructive" });
        } finally {
            setSaleSubmitting(false);
        }
    };

    const handleVoidClick = (activeLineIds) => {
        setVoidTargetIds(Array.isArray(activeLineIds) ? activeLineIds : [activeLineIds]);
        setVoidReason("");
        setVoidReasonError("");
        setVoidDialogOpen(true);
    };

    const handleVoidConfirm = async () => {
        if (!voidReason.trim()) {
            setVoidReasonError("Void reason is required before confirming.");
            return;
        }
        setVoidReasonError("");
        const sessionUser = getSessionUser();
        setVoidSaving(true);
        try {
            for (const lineId of voidTargetIds) {
                await voidSale(lineId, sessionUser.username || "system", voidReason.trim());
            }
            toast({ title: "Sale Voided", description: "Inventory has been restored. Transaction preserved for audit." });
            setVoidDialogOpen(false);
            await refreshData();
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setVoidSaving(false);
        }
    };

    const handleUnvoidClick = (sale) => {
        setUnvoidTarget(sale);
        setUnvoidReason("");
        setUnvoidReasonError("");
        setUnvoidDialogOpen(true);
    };

    const handleUnvoidConfirm = async () => {
        if (!unvoidReason.trim()) {
            setUnvoidReasonError("Unvoid reason is required before confirming.");
            return;
        }
        setUnvoidReasonError("");
        const sessionUser = getSessionUser();
        setUnvoidSaving(true);
        try {
            await unvoidSale(unvoidTarget.id, sessionUser.username || "system", unvoidReason.trim());
            toast({ title: "Sale Unvoided", description: "Sale restored to ACTIVE. Stock has been re-deducted." });
            setUnvoidDialogOpen(false);
            await refreshData();
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setUnvoidSaving(false);
        }
    };

    const openBillDetails = (billId) => {
        setSelectedBillId(String(billId));
        setBillOpen(true);
    };

    const openFullEdit = (billGroupId) => {
        const billLines = sales.filter((sale) => (sale.saleGroupId ?? String(sale.id)) === String(billGroupId) && sale.status === "ACTIVE");
        const originalQty = {};
        const mergedItems = {};
        billLines.forEach((line) => {
            const productId = String(line.productId);
            originalQty[productId] = (originalQty[productId] || 0) + line.quantitySold;
            if (!mergedItems[productId]) {
                mergedItems[productId] = { id: productId, productId, quantity: 0 };
            }
            mergedItems[productId].quantity += line.quantitySold;
        });
        setEditBillOriginalQty(originalQty);
        setEditBillGroupId(String(billGroupId));
        setEditBillDate(localTodayYmd());
        setEditBillNotes(billLines[0]?.notes || "");
        setEditBillCustomerName(billLines[0]?.customerName || "");
        setEditBillCustomerEmail(billLines[0]?.customerEmail || "");
        setEditBillReason("");
        setEditBillItems(Object.values(mergedItems));
        setFullEditOpen(true);
    };

    const handleFullEditSave = async () => {
        if (!editBillGroupId) return;
        const validItems = editBillItems.filter((item) => item.productId && typeof item.quantity === "number" && item.quantity > 0);
        if (validItems.length === 0) {
            toast({ title: "Validation Error", description: "At least one product line is required.", variant: "destructive" });
            return;
        }

        const hasPartialLine = editBillItems.some((item) =>
            (item.productId && (typeof item.quantity !== "number" || item.quantity <= 0))
            || (!item.productId && typeof item.quantity === "number" && item.quantity > 0)
        );
        if (hasPartialLine) {
            toast({ title: "Incomplete Line", description: "Some lines are partially filled. Complete or remove them before saving.", variant: "destructive" });
            return;
        }
        if (!editBillReason.trim()) {
            toast({ title: "Reason required", description: "Please enter a reason for this edit.", variant: "destructive" });
            return;
        }
        if (editBillCustomerName.trim().length > 20) {
            toast({ title: "Name too long", description: "Customer name must be 20 characters or fewer.", variant: "destructive" });
            return;
        }

        const billLine = sales.find((sale) => (sale.saleGroupId ?? String(sale.id)) === editBillGroupId && sale.status === "ACTIVE");
        if (billLine && !canEditThisSaleRecord(billLine)) {
            toast({ title: "Permission Denied", description: "You can only edit your own bills within 2 hours of recording.", variant: "destructive" });
            setFullEditOpen(false);
            return;
        }

        const productIds = validItems.map((item) => item.productId);
        if (new Set(productIds).size !== productIds.length) {
            toast({ title: "Duplicate Product", description: "The same product appears more than once. Merge the quantities into one line.", variant: "destructive" });
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (editBillCustomerEmail.trim() && !emailRegex.test(editBillCustomerEmail.trim())) {
            toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
            return;
        }

        for (const item of validItems) {
            const currentStock = getItemCurrentStock(item.productId);
            const freedQty = editBillOriginalQty[item.productId] || 0;
            const effectiveAvailable = currentStock + freedQty;
            const product = getProductById(item.productId);
            if (item.quantity > effectiveAvailable) {
                toast({ title: "Insufficient Stock", description: `Only ${effectiveAvailable} units available for ${product?.name ?? "this product"} (including ${freedQty} freed from this bill).`, variant: "destructive" });
                return;
            }
        }

        const sessionUser = getSessionUser();
        setEditBillSaving(true);
        try {
            await updateBill(editBillGroupId, {
                saleDate: editBillDate,
                recordedBy: sessionUser.username || "system",
                notes: editBillNotes,
                items: validItems.map((item) => ({ productId: parseInt(item.productId, 10), quantity: item.quantity })),
                customerName: editBillCustomerName.trim() || null,
                customerEmail: editBillCustomerEmail.trim() || null,
                lastEditedBy: sessionUser.username || "system",
                editReason: editBillReason.trim(),
            });
            toast({ title: "Bill Updated", description: "Inventory adjusted. Audit trail recorded." });
            setFullEditOpen(false);
            await refreshData();
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setEditBillSaving(false);
        }
    };

    const handleFinalizeDraft = async (billGroupId) => {
        if (finalizingBillId === billGroupId) return;
        const sessionUser = getSessionUser();
        setFinalizingBillId(billGroupId);
        try {
            await finalizeDraft(billGroupId, sessionUser.username || "system");
            toast({ title: "Draft Finalized", description: "Stock deducted. Bill is now ACTIVE." });
            await refreshData();
        } catch (error) {
            toast({ title: "Error", description: error.message, variant: "destructive" });
        } finally {
            setFinalizingBillId(null);
        }
    };

    const selectedBillLines = selectedBillId ? sales.filter((sale) => (sale.saleGroupId ?? String(sale.id)) === selectedBillId) : [];
    const selectedBillActive = selectedBillLines.filter((sale) => sale.status !== "VOID");

    const isStaff = role === "Staff";
    const isDark = false;
    const bgCard = isStaff
        ? "card-premium border-none shadow-[0_8px_30px_rgb(78,52,46,0.04)] bg-[#F9F5EC]"
        : "card-premium border-none shadow-premium bg-white";
    const textLabel = isStaff ? "text-[#4E342E]/50" : "text-[#0F172A]/40";
    const textValue = isStaff ? "text-[#4E342E]" : "text-[#0F172A]";
    const inputBg = isStaff
        ? "bg-[#F5EBE1] border-[#4E342E]/10 placeholder:text-[#4E342E]/30"
        : "bg-white border-gray-200 placeholder:text-[#0F172A]/30";

    return (
        <div className="space-y-10">
            <SalesSummaryCards
                bgCard={bgCard}
                textLabel={textLabel}
                textValue={textValue}
                todayCount={todayCount}
                todayQuantity={todayQuantity}
            />

            <div className="grid gap-8 lg:grid-cols-3">
                <div className="space-y-4 lg:col-span-1">
                    <PosFormCard
                        bgCard={bgCard}
                        billTotal={billTotal}
                        amountGiven={amountGiven}
                        amountGivenNum={amountGivenNum}
                        customerEmail={customerEmail}
                        customerName={customerName}
                        handleRecordSale={handleRecordSale}
                        inputBg={inputBg}
                        isDark={isDark}
                        isFormValid={isFormValid}
                        saleSubmitting={saleSubmitting}
                        items={items}
                        lineTotals={lineTotals}
                        maxReasonablePayment={maxReasonablePayment}
                        notes={notes}
                        productPickerOpener={openProductPicker}
                        productsById={productsById}
                        quickPickAmounts={quickPickAmounts}
                        saleDate={saleDate}
                        sendReceipt={sendReceipt}
                        setAmountGiven={setAmountGiven}
                        setCustomerEmail={setCustomerEmail}
                        setCustomerName={setCustomerName}
                        setItems={setItems}
                        setNotes={setNotes}
                        setSendReceipt={setSendReceipt}
                        stockMap={stockMap}
                        textLabel={textLabel}
                        textValue={textValue}
                    />

                    {isManager ? <SalesOversightCard bgCard={bgCard} isDark={isDark} textValue={textValue} /> : null}
                </div>

                <div className="lg:col-span-2">
                    <SalesHistoryCard
                        bgCard={bgCard}
                        currentUsername={currentUser.username}
                        displaySales={displaySales}
                        filterDateError={filterDateError}
                        filterDateFrom={filterDateFrom}
                        filterDateTo={filterDateTo}
                        filterSearch={filterSearch}
                        filterStatus={filterStatus}
                        inputBg={inputBg}
                        isDark={isDark}
                        isManager={isManager}
                        isStaff={isStaff}
                        salesTab={salesTab}
                        sortBy={sortBy}
                        textLabel={textLabel}
                        textValue={textValue}
                        canEditThisSale={canEditThisSaleRecord}
                        editWindowExpired={editWindowExpired}
                        getEditTimeLeft={getEditWindowText}
                        onClearFilters={clearFilters}
                        onFilterDateFromChange={handleFilterDateFromChange}
                        onFilterDateToChange={handleFilterDateToChange}
                        onFilterSearchChange={setFilterSearch}
                        onFilterStatusChange={setFilterStatus}
                        finalizingBillId={finalizingBillId}
                        onFinalizeDraft={handleFinalizeDraft}
                        onOpenBillDetails={openBillDetails}
                        onOpenFullEdit={openFullEdit}
                        onOpenUnvoid={handleUnvoidClick}
                        onOpenVoid={handleVoidClick}
                        onSalesTabChange={setSalesTab}
                        onSortByChange={setSortBy}
                    />
                </div>
            </div>

            <VoidSaleDialog
                inputBg={inputBg}
                open={voidDialogOpen}
                reason={voidReason}
                reasonError={voidReasonError}
                saving={voidSaving}
                textLabel={textLabel}
                onClose={setVoidDialogOpen}
                onConfirm={handleVoidConfirm}
                onReasonChange={(value, preset = false) => {
                    setVoidReason(value);
                    if (preset || voidReasonError) setVoidReasonError("");
                }}
            />

            <UnvoidSaleDialog
                inputBg={inputBg}
                open={unvoidDialogOpen}
                reason={unvoidReason}
                reasonError={unvoidReasonError}
                saving={unvoidSaving}
                target={unvoidTarget}
                textLabel={textLabel}
                onClose={setUnvoidDialogOpen}
                onConfirm={handleUnvoidConfirm}
                onReasonChange={(value) => {
                    setUnvoidReason(value);
                    if (unvoidReasonError) setUnvoidReasonError("");
                }}
            />

            <BillDetailsDialog
                open={billOpen}
                selectedBillActive={selectedBillActive}
                selectedBillId={selectedBillId}
                selectedBillLines={selectedBillLines}
                textLabel={textLabel}
                textValue={textValue}
                onClose={setBillOpen}
            />

            <FullBillEditDialog
                editBillDate={editBillDate}
                editBillCustomerEmail={editBillCustomerEmail}
                editBillCustomerName={editBillCustomerName}
                editBillGroupId={editBillGroupId}
                editBillItems={editBillItems}
                editBillNotes={editBillNotes}
                editBillPricingPreview={editBillPricingPreview}
                editBillReason={editBillReason}
                editBillSaving={editBillSaving}
                getExpiredItemStock={getExpiredItemStock}
                getItemCurrentStock={getItemCurrentStock}
                getEditableBillStock={getEditableBillStock}
                getProductById={getProductById}
                inputBg={inputBg}
                open={fullEditOpen}
                productPickerOpener={openProductPicker}
                setEditBillCustomerEmail={setEditBillCustomerEmail}
                setEditBillCustomerName={setEditBillCustomerName}
                setEditBillItems={setEditBillItems}
                setEditBillNotes={setEditBillNotes}
                setEditBillReason={setEditBillReason}
                textLabel={textLabel}
                textValue={textValue}
                onClose={setFullEditOpen}
                onSave={handleFullEditSave}
            />

            <ProductPickerDialog
                getNextFefoDiscountInfo={getNextFefoDiscountInfo}
                open={productPickerOpen}
                pickerSearch={productPickerSearch}
                products={products}
                stockMap={stockMap}
                onClose={setProductPickerOpen}
                onPickProduct={handlePickProduct}
                onSearchChange={setProductPickerSearch}
            />
        </div>
    );
}
