import { authFetch } from "@/lib/apiConfig";

export const getProducts = async () => {
    const response = await authFetch("/products");
    if (!response.ok) throw new Error("Failed to fetch products");
    return response.json();
};

export const getAvailableQuantity = async (productId) => {
    const response = await authFetch(`/products/${productId}/available-quantity`);
    if (!response.ok) throw new Error("Failed to fetch available quantity");
    const data = await response.json();
    return data.availableQuantity;
};

export const getSalesHistory = async () => {
    const response = await authFetch("/sales");
    if (!response.ok) throw new Error("Failed to fetch sales history");
    const sales = await response.json();
    return sales.map(s => ({
        ...s,
        productId: String(s.product.id),
        productName: s.product.name,
        batchId: s.batch?.id != null ? String(s.batch.id) : null,
        batchNumber: s.batch?.batchNumber ?? null,
        batchExpiryDate: s.batch?.expiryDate ?? null,
    })).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime() || b.id - a.id);
};

export const recordPosSale = async (request) => {
    const response = await authFetch("/sales/pos", {
        method: "POST",
        body: JSON.stringify(request),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to record sale");
    }
    return response.json();
};

export const voidSale = async (saleId, voidedBy, voidReason) => {
    const response = await authFetch(`/sales/${saleId}/void`, {
        method: "POST",
        body: JSON.stringify({ voidedBy, voidReason }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to void sale");
    }
    return response.json();
};

export const editSaleQuantity = async (saleId, newQuantity, editedBy, editReason) => {
    const response = await authFetch(`/sales/${saleId}`, {
        method: "PUT",
        body: JSON.stringify({ newQuantity, editedBy, editReason }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to edit sale");
    }
    return response.json();
};

export const updateBill = async (billGroupId, request) => {
    const response = await authFetch(`/sales/bill/${encodeURIComponent(billGroupId)}`, {
        method: "PUT",
        body: JSON.stringify(request),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update bill");
    }
    return response.json();
};

export const finalizeDraft = async (billGroupId, finalizedBy) => {
    const response = await authFetch(
        `/sales/bill/${encodeURIComponent(billGroupId)}/finalize?finalizedBy=${encodeURIComponent(finalizedBy)}`,
        { method: "POST" }
    );
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to finalize draft");
    }
    return response.json();
};

export const unvoidSale = async (saleId, unvoidedBy, unvoidReason) => {
    const response = await authFetch(`/sales/${saleId}/unvoid`, {
        method: "POST",
        body: JSON.stringify({ unvoidedBy, unvoidReason }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to unvoid sale");
    }
    return response.json();
};

export const checkDuplicate = async (productId, saleDate, quantity, customerName) => {
    try {
        const params = new URLSearchParams({ productId, saleDate, quantity });
        if (customerName) params.set("customerName", customerName);
        const response = await authFetch(`/sales/check-duplicate?${params}`);
        if (!response.ok) return false;
        const data = await response.json();
        return data.isDuplicate;
    } catch {
        return false;
    }
};
