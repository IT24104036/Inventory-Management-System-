export function localTodayYmd() {
    return new Date().toLocaleDateString("en-CA");
}

export function createAccess(role, canEdit, canManageSales) {
    const isAdmin = role === "Admin";
    return {
        isAdmin,
        isManager: isAdmin || canManageSales,
        isStaffEditor: !isAdmin && !canManageSales && canEdit,
        isViewer: !isAdmin && !canManageSales && !canEdit,
    };
}

export function isSellableBatch(batch, todayYmd = localTodayYmd()) {
    if (!batch || Number(batch.quantity) <= 0 || !batch.expiryDate) return false;
    return batch.expiryDate >= todayYmd;
}

export function buildBatchSnapshot(baseBatches, todayYmd = localTodayYmd()) {
    const byProduct = {};

    (baseBatches || [])
        .filter((batch) => isSellableBatch(batch, todayYmd))
        .forEach((batch) => {
            const productId = String(batch.product?.id ?? batch.productId ?? "");
            if (!productId) return;
            if (!byProduct[productId]) byProduct[productId] = [];

            byProduct[productId].push({
                id: String(batch.id),
                batchNumber: batch.batchNumber,
                expiryDate: batch.expiryDate,
                quantity: Number(batch.quantity) || 0,
            });
        });

    Object.values(byProduct).forEach((list) => {
        list.sort((a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate)) || String(a.id).localeCompare(String(b.id)));
    });

    return byProduct;
}

export function cloneBatchSnapshot(snapshot) {
    return Object.fromEntries(
        Object.entries(snapshot || {}).map(([productId, batches]) => [
            productId,
            (batches || []).map((batch) => ({ ...batch })),
        ]),
    );
}

export function buildEditableBatchSnapshot(baseBatches, billLines, todayYmd = localTodayYmd()) {
    const snapshot = buildBatchSnapshot(baseBatches, todayYmd);

    (billLines || [])
        .filter((line) => line?.status !== "VOID")
        .forEach((line) => {
            const productId = String(line.product?.id ?? line.productId ?? "");
            const batchId = String(line.batch?.id ?? line.batchId ?? "");
            const expiryDate = line.batch?.expiryDate ?? line.batchExpiryDate ?? null;
            const quantitySold = Number(line.quantitySold) || 0;

            if (!productId || !batchId || quantitySold <= 0 || !expiryDate || expiryDate < todayYmd) return;

            if (!snapshot[productId]) snapshot[productId] = [];

            const existingBatch = snapshot[productId].find((batch) => String(batch.id) === batchId);
            if (existingBatch) {
                existingBatch.quantity += quantitySold;
            } else {
                snapshot[productId].push({
                    id: batchId,
                    batchNumber: line.batch?.batchNumber ?? line.batchNumber ?? null,
                    expiryDate,
                    quantity: quantitySold,
                });
            }

            snapshot[productId].sort(
                (a, b) => String(a.expiryDate).localeCompare(String(b.expiryDate)) || String(a.id).localeCompare(String(b.id)),
            );
        });

    return snapshot;
}

export function getSnapshotAvailableQuantity(snapshot, productId) {
    return (snapshot[String(productId)] || []).reduce((sum, batch) => sum + (Number(batch.quantity) || 0), 0);
}

export function getEffectiveBatchDiscount(batchId, discountMap) {
    return discountMap[String(batchId)] ?? 0;
}

export function simulatePricing({ sourceItems, baseBatches, batchSnapshot, discountMap, productsById, todayYmd = localTodayYmd() }) {
    const snapshot = cloneBatchSnapshot(batchSnapshot ?? buildBatchSnapshot(baseBatches, todayYmd));
    const lineTotals = (sourceItems || []).map((item) => {
        if (!item.productId || typeof item.quantity !== "number" || item.quantity <= 0) return 0;
        const product = productsById[String(item.productId)];
        if (!product) return 0;

        const pool = snapshot[String(item.productId)] || [];
        let remaining = item.quantity;
        let total = 0;

        for (const batch of pool) {
            if (remaining <= 0) break;
            if (batch.quantity <= 0) continue;

            const take = Math.min(batch.quantity, remaining);
            const rate = getEffectiveBatchDiscount(batch.id, discountMap);
            total += (product.sellingPrice ?? 0) * (1 - rate / 100) * take;
            batch.quantity -= take;
            remaining -= take;
        }

        return total;
    });

    return {
        lineTotals,
        total: lineTotals.reduce((sum, value) => sum + value, 0),
    };
}

export function buildStockMap(batches) {
    return (batches || []).reduce((acc, batch) => {
        if (!isSellableBatch(batch)) return acc;
        const productId = String(batch.product?.id ?? batch.productId ?? "");
        if (!productId) return acc;
        acc[productId] = (acc[productId] || 0) + (Number(batch.quantity) || 0);
        return acc;
    }, {});
}

export function buildExpiredStockMap(batches, todayYmd = localTodayYmd()) {
    return (batches || []).reduce((acc, batch) => {
        const productId = String(batch.product?.id ?? batch.productId ?? "");
        const quantity = Number(batch.quantity) || 0;
        if (!productId || quantity <= 0 || !batch.expiryDate || batch.expiryDate >= todayYmd) return acc;
        acc[productId] = (acc[productId] || 0) + quantity;
        return acc;
    }, {});
}

export function buildDiscountMap(discounts) {
    const map = {};
    (discounts || []).forEach((discount) => {
        if (discount.status !== "ACTIVE" || !discount.batch?.id) return;
        map[String(discount.batch.id)] = discount.finalRate ?? discount.suggestedRate ?? 0;
    });
    return map;
}

export function getQuickPickAmounts(billTotal, notes = [20, 50, 100, 200, 500, 1000, 2000, 5000]) {
    if (billTotal <= 0) return [];
    const maxReasonablePayment = Math.ceil(billTotal / 5000) * 5000;
    const picks = new Set([Math.ceil(billTotal)]);
    notes.forEach((note) => {
        const rounded = Math.ceil(billTotal / note) * note;
        if (rounded >= billTotal && rounded <= maxReasonablePayment) picks.add(rounded);
    });
    return [...picks].sort((a, b) => a - b);
}

export function parseCreatedAt(value) {
    if (!value) return Number.NaN;
    return new Date(value).getTime();
}

export function canEditSale({ sale, isManager, canEdit, currentUsername, now }) {
    if (sale.status === "VOID") return false;
    if (isManager) return true;
    if (!canEdit) return false;
    if (sale.recordedBy !== currentUsername) return false;
    return (now - parseCreatedAt(sale.createdAt)) <= 2 * 60 * 60 * 1000;
}

export function isEditWindowExpired({ sale, isManager, canEdit, now }) {
    if (isManager || !canEdit) return false;
    return (now - parseCreatedAt(sale.createdAt)) > 2 * 60 * 60 * 1000;
}

export function getEditTimeLeft({ sale, isManager, canEdit, currentUsername, now }) {
    if (isManager || !canEdit || !sale.createdAt) return null;
    if (sale.recordedBy !== currentUsername) return null;
    const msLeft = (2 * 60 * 60 * 1000) - (now - parseCreatedAt(sale.createdAt));
    if (msLeft <= 0) return null;
    const totalMinutes = Math.floor(msLeft / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

export function groupBills(sales) {
    const billMap = new Map();
    (sales || []).forEach((sale) => {
        const key = sale.saleGroupId ?? String(sale.id);
        if (!billMap.has(key)) billMap.set(key, []);
        billMap.get(key).push(sale);
    });

    return Array.from(billMap.entries()).map(([billId, lines]) => {
        const activeLines = lines.filter((line) => line.status !== "VOID");
        const allVoid = activeLines.length === 0;
        const anyDraft = activeLines.some((line) => line.status === "DRAFT");
        const billStatus = allVoid ? "VOID" : anyDraft ? "DRAFT" : "ACTIVE";
        const displayLines = allVoid ? lines : activeLines;
        const totalAmount = displayLines.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0);
        const totalQty = displayLines.reduce((sum, line) => sum + (line.quantitySold ?? 0), 0);
        const rep = displayLines[0];
        return { billId, lines, activeLines, displayLines, billStatus, totalAmount, totalQty, rep };
    });
}

export function statusBadge(status) {
    if (status === "ACTIVE") return "bg-emerald-100 text-emerald-600";
    if (status === "DRAFT") return "bg-yellow-100 text-yellow-700";
    return "bg-gray-100 text-gray-600";
}

export function formatDateTime(value) {
    if (!value) return null;
    try {
        return new Date(value).toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return value;
    }
}

export function formatTime(value) {
    if (!value) return null;
    try {
        return new Date(value).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return null;
    }
}
