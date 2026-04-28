import { apiUrl, authFetch } from "@/lib/apiConfig";

/** Parse backend error body and throw a clear message (auth vs server vs message). */
const throwIfNotOk = async (response, fallback) => {
    if (response.ok) return;
    const err = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
        throw new Error(
            err.message || "Session expired or not authorized. Please sign in again."
        );
    }
    throw new Error(err.message || err.error || `${fallback} (${response.status})`);
};

export const loginUser = async (identifier, password, role) => {
    const trimmedIdentifier = String(identifier || "").trim();
    const trimmedRole = String(role || "").trim();
    const isEmail = trimmedIdentifier.includes("@");

    const loginPayload = {
        password,
        username: trimmedIdentifier,
        role: trimmedRole,
    };

    if (isEmail) {
        loginPayload.email = trimmedIdentifier;
    }

    const response = await fetch(apiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginPayload),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Invalid credentials");
    }
    return response.json();
};
// Fetch all users
export const getUsers = async () => {
    const response = await authFetch("/admin/users");
    if (!response.ok) {
        throw new Error("Failed to fetch users");
    }
    return response.json();
};
// Fetch login history
export const getLoginHistory = async () => {
    const response = await authFetch("/logins");
    if (!response.ok) {
        throw new Error("Failed to fetch login history");
    }
    return response.json();
};
// Create a new user
export const createUser = async (userData) => {
    const response = await authFetch("/admin/users", {
        method: "POST",
        body: JSON.stringify(userData),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create user");
    }
    return response.json();
};
// Update an existing user
export const updateUser = async (id, userData) => {
    const response = await authFetch(`/admin/users/${id}`, {
        method: "PUT",
        body: JSON.stringify(userData),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update user");
    }
    return response.json();
};
// Delete a user (revoke access)
export const deleteUser = async (id) => {
    const response = await authFetch(`/admin/users/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        throw new Error("Failed to delete user");
    }
};
// Unlock user account
export const unlockUser = async (id) => {
    const response = await authFetch(`/admin/users/${id}/unlock`, {
        method: "PUT",
    });
    if (!response.ok) {
        throw new Error("Failed to unlock user");
    }
    return response.json();
};
/** Fetch the logged-in staff member's own profile */
export const getStaffProfile = async (id) => {
    const response = await authFetch(`/staff/profile/${id}`);
    if (!response.ok) {
        throw new Error("Failed to fetch profile");
    }
    return response.json();
};
/** Update name and/or password for the logged-in staff member */
export const updateStaffProfile = async (id, payload) => {
    const response = await authFetch(`/staff/profile/${id}`, {
        method: "PUT",
        body: JSON.stringify(payload),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update profile");
    }
    return response.json();
};
// --- Product Management API ---
export const getProducts = async () => {
    const response = await authFetch("/products");
    if (!response.ok) {
        throw new Error("Failed to fetch products");
    }
    return response.json();
};
export const createProduct = async (productData) => {
    const response = await authFetch("/products", {
        method: "POST",
        body: JSON.stringify(productData),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create product");
    }
    return response.json();
};
export const updateProduct = async (id, productData) => {
    const response = await authFetch(`/products/${id}`, {
        method: "PUT",
        body: JSON.stringify(productData),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update product");
    }
    return response.json();
};
export const deleteProduct = async (id) => {
    const response = await authFetch(`/products/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        throw new Error("Failed to delete product");
    }
};
// --- Inventory / Batch Management API ---
export const getBatches = async () => {
    const response = await authFetch("/inventory/batches");
    if (!response.ok) {
        throw new Error("Failed to fetch batches");
    }
    return response.json();
};
export const createBatch = async (batchData) => {
    const response = await authFetch("/inventory/batches", {
        method: "POST",
        body: JSON.stringify(batchData),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create batch");
    }
    return response.json();
};
export const updateBatch = async (id, batchData) => {
    const response = await authFetch(`/inventory/batches/${id}`, {
        method: "PUT",
        body: JSON.stringify(batchData),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to update batch");
    }
    return response.json();
};
export const deleteBatch = async (id) => {
    const response = await authFetch(`/inventory/batches/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete batch");
    }
};

/**
 * Waste history with optional filters.
 * Params: from, to (YYYY-MM-DD), batchId, productId, category, reasonCode (SPOILAGE, DAMAGE, …)
 */
export const getWasteHistory = async ({
    from,
    to,
    batchId,
    productId,
    category,
    reasonCode,
} = {}) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (batchId != null && batchId !== "") params.set("batchId", String(batchId));
    if (productId != null && productId !== "") params.set("productId", String(productId));
    if (category) params.set("category", category);
    if (reasonCode) params.set("reasonCode", reasonCode);
    const qs = params.toString();
    const response = await authFetch(`/inventory/waste${qs ? `?${qs}` : ""}`);
    await throwIfNotOk(response, "Failed to fetch waste history");
    return response.json();
};

/** Batch IDs that have at least one waste record (for UI badges). */
export const getWasteLoggedBatchIds = async () => {
    const response = await authFetch("/inventory/waste/logged-batch-ids");
    await throwIfNotOk(response, "Failed to fetch waste batch ids");
    return response.json();
};

/** Last 7 days vs previous 7 days waste cost & units. */
export const getWasteWeeklySummary = async () => {
    const response = await authFetch("/inventory/waste/weekly-summary");
    await throwIfNotOk(response, "Failed to fetch waste summary");
    return response.json();
};

/** Latest inventory stock movement audit trail. */
export const getStockAuditHistory = async () => {
    const response = await authFetch("/inventory/stock-audit");
    await throwIfNotOk(response, "Failed to fetch stock audit history");
    return response.json();
};

/** Log waste for an expired batch (reduces quantity, persists waste_records row). */
export const recordBatchWaste = async (batchId, { quantity, notes, reasonCode }) => {
    const response = await authFetch(`/inventory/batches/${batchId}/waste`, {
        method: "POST",
        body: JSON.stringify({
            quantity: Number(quantity),
            notes: notes != null && String(notes).trim() !== "" ? String(notes).trim() : null,
            reasonCode: reasonCode && String(reasonCode).trim() !== "" ? String(reasonCode).trim().toUpperCase() : "OTHER",
        }),
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to record waste");
    }
    return response.json();
};
// --- Discount & Alerts API ---
export const getDiscounts = async () => {
    const response = await authFetch("/discounts");
    if (!response.ok) throw new Error("Failed to fetch discounts");
    return response.json();
};
export const generateDiscountSuggestions = async () => {
    const response = await authFetch("/discounts/generate", { method: "POST" });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to generate suggestions");
    }
    return response.json();
};
export const updateDiscount = async (id, data) => {
    const response = await authFetch(`/discounts/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update discount");
    }
    return response.json();
};
export const requestDiscountReview = async (id, requestedBy) => {
    const response = await authFetch(`/discounts/${id}/request-review`, {
        method: "POST",
        body: JSON.stringify({
            requestedBy: requestedBy != null ? String(requestedBy).trim() : "",
        }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to request manager review");
    }
    return response.json();
};
export const deleteDiscount = async (id) => {
    const response = await authFetch(`/discounts/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error("Failed to delete discount");
};
export const getExpiryActionAlerts = async () => {
    const response = await authFetch("/alerts/expiry-actions");
    if (!response.ok) throw new Error("Failed to fetch expiry action alerts");
    return response.json();
};

// --- Reports API ---
export const getReportsSummary = async () => {
    const response = await authFetch("/reports/summary");
    if (!response.ok) throw new Error("Failed to fetch reports summary");
    return response.json();
};
export const getExpiredLossReport = async () => {
    const response = await authFetch("/reports/expired-loss");
    if (!response.ok) throw new Error("Failed to fetch expired loss report");
    return response.json();
};
export const getNearExpiryReport = async () => {
    const response = await authFetch("/reports/near-expiry");
    if (!response.ok) throw new Error("Failed to fetch near-expiry report");
    return response.json();
};
export const getMonthlyLossReport = async () => {
    const response = await authFetch("/reports/monthly-loss");
    if (!response.ok) throw new Error("Failed to fetch monthly loss report");
    return response.json();
};
export const getProductMovementReport = async () => {
    const response = await authFetch("/reports/product-movement");
    if (!response.ok) throw new Error("Failed to fetch product movement report");
    return response.json();
};
export const getSalesVsExpiryReport = async () => {
    const response = await authFetch("/reports/sales-vs-expiry");
    if (!response.ok) throw new Error("Failed to fetch sales vs expiry report");
    return response.json();
};

// --- Role Management API ---
export const getRoles = async () => {
    const response = await authFetch("/admin/roles");
    if (!response.ok) throw new Error("Failed to fetch roles");
    return response.json();
};
export const createRole = async (roleData) => {
    const response = await authFetch("/admin/roles", {
        method: "POST",
        body: JSON.stringify(roleData),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create role");
    }
    return response.json();
};
export const updateRole = async (id, roleData) => {
    const response = await authFetch(`/admin/roles/${id}`, {
        method: "PUT",
        body: JSON.stringify(roleData),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update role");
    }
    return response.json();
};
export const deleteRole = async (id) => {
    const response = await authFetch(`/admin/roles/${id}`, {
        method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete role");
};

// --- Password Reset API ---
export const forgotPassword = async (email) => {
    const response = await fetch(apiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to send OTP");
    }
    return response.json();
};

export const verifyOtp = async (email, otp) => {
    const response = await fetch(apiUrl("/auth/verify-otp"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Invalid OTP");
    }
    return response.json();
};

// ── Improvement #17: clear offline / server-down messages ────────────────────
// Previously: if Spring Boot was offline, the browser threw a raw TypeError
//   ("Failed to fetch") with no guidance for the user.
// Now: network-level failures are caught and re-thrown with a human-readable
//   message explaining WHICH server to check.
// HTTP-level errors (4xx / 5xx) are still handled by the throwIfNotOk helper.
const ML_OFFLINE_MSG =
    "ML service is unavailable. Make sure both Spring Boot (port 8080) " +
    "and the Python ML server (port 8000) are running.";

export const predictExpiryRisk = async (payload) => {
    try {
        const response = await authFetch("/ai/predict", {
            method: "POST",
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || "Failed to get expiry risk prediction");
        }
        return response.json();
    } catch (err) {
        // TypeError means the network call never reached the server
        if (err instanceof TypeError) throw new Error(ML_OFFLINE_MSG);
        throw err;
    }
};

export const predictExpiryRiskFromBatch = async (batchId) => {
    try {
        const response = await authFetch(`/ai/predict-from-batch/${batchId}`, {
            method: "POST",
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || "Failed to predict from batch");
        }
        return response.json();
    } catch (err) {
        if (err instanceof TypeError) throw new Error(ML_OFFLINE_MSG);
        throw err;
    }
};

export const predictAllBatches = async () => {
    try {
        const response = await authFetch("/ai/predict-all", {
            method: "POST",
        });
        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.message || "Failed to run bulk predictions");
        }
        return response.json();
    } catch (err) {
        if (err instanceof TypeError) throw new Error(ML_OFFLINE_MSG);
        throw err;
    }
};


export const getRiskSummary = async () => {
    const response = await authFetch("/ai/risk-summary");
    await throwIfNotOk(response, "Failed to fetch risk summary");
    return response.json();
};

export const getValidationSummary = async () => {
    const response = await authFetch("/ai/validation-summary");
    await throwIfNotOk(response, "Failed to fetch ML validation summary");
    return response.json();
};

export const getValidationTrend = async () => {
    const response = await authFetch("/ai/validation-trend");
    await throwIfNotOk(response, "Failed to fetch ML validation trend");
    return response.json();
};

export const resetPassword = async (email, newPassword) => {
    const response = await fetch(apiUrl("/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || "Failed to reset password");
    }
    return response.json();
};
