// src/lib/mockSalesData.ts
// Initial Mock Data
let products = [
    { id: "p1", name: "Fresh Milk 1L", category: "Dairy", sellingPrice: 350.00 },
    { id: "p2", name: "Yogurt Plain 500g", category: "Dairy", sellingPrice: 420.00 },
    { id: "p3", name: "Cheese Spread 200g", category: "Dairy", sellingPrice: 550.00 },
    { id: "p4", name: "Leafy Greens Mix", category: "Produce", sellingPrice: 280.00 },
];
let batches = [
    { id: "b1", productId: "p1", quantity: 20, expiryDate: "2026-03-05" },
    { id: "b2", productId: "p1", quantity: 30, expiryDate: "2026-03-10" },
    { id: "b3", productId: "p2", quantity: 15, expiryDate: "2026-03-06" },
    { id: "b4", productId: "p3", quantity: 50, expiryDate: "2026-04-01" },
    { id: "b5", productId: "p4", quantity: 10, expiryDate: "2026-03-08" },
];
let sales = [
    {
        id: "s1",
        productId: "p1",
        quantitySold: 5,
        saleDate: "2026-03-03",
        recordedBy: "jdoe",
        status: "ACTIVE",
        saleGroupId: "BILL-1001",
        unitPrice: 350.00,
        lineTotal: 5 * 350.00
    }
];
// Helper functions (Simulating backend logic)
export const getProducts = () => {
    return products;
};
export const getAvailableQuantity = (productId) => {
    return batches
        .filter(b => b.productId === productId && new Date(b.expiryDate) >= new Date())
        .reduce((sum, b) => sum + b.quantity, 0);
};
export const getSalesHistory = () => {
    return sales.map(sale => {
        const product = products.find(p => p.id === sale.productId);
        return {
            ...sale,
            productName: product ? product.name : "Unknown Product"
        };
    }).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime() || parseInt(b.id.substring(1)) - parseInt(a.id.substring(1)));
};
// FEFO Deduction Logic
export const recordSale = (productId, quantity, date, username, notes, saleGroupId) => {
    if (quantity <= 0)
        throw new Error("Quantity must be greater than 0");
    const available = getAvailableQuantity(productId);
    if (quantity > available)
        throw new Error("Insufficient stock available.");
    // Sort batches by expiry date (ascending)
    let productBatches = batches
        .filter(b => b.productId === productId && b.quantity > 0 && new Date(b.expiryDate) >= new Date())
        .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
    let remainingToDeduct = quantity;
    // We modify the batches array in place (simulating DB update)
    for (const batch of productBatches) {
        if (remainingToDeduct === 0)
            break;
        const batchRef = batches.find(b => b.id === batch.id);
        if (batchRef) {
            if (batchRef.quantity >= remainingToDeduct) {
                batchRef.quantity -= remainingToDeduct;
                remainingToDeduct = 0;
            }
            else {
                remainingToDeduct -= batchRef.quantity;
                batchRef.quantity = 0;
            }
        }
    }
    const product = products.find(p => p.id === productId);
    const unitPrice = product?.sellingPrice ?? 0;
    const newSale = {
        id: `s${sales.length + 1}`,
        productId,
        quantitySold: quantity,
        saleDate: date,
        recordedBy: username,
        status: "ACTIVE",
        notes,
        saleGroupId,
        unitPrice,
        lineTotal: quantity * unitPrice
    };
    sales = [newSale, ...sales];
    return newSale;
};
export const voidSale = (saleId) => {
    const saleIndex = sales.findIndex(s => s.id === saleId);
    if (saleIndex === -1)
        throw new Error("Sale not found");
    const sale = sales[saleIndex];
    if (sale.status === "VOID")
        throw new Error("Sale is already voided");
    // Reverse inventory deduction.
    // In a real DB, we'd track EXACTLY which batches were reduced.
    // For this mock, we will just add the quantity back to the LATEST batch, 
    // or create a new "recovery" batch if needed to keep things simple and functional for testing.
    let targetBatch = batches
        .filter(b => b.productId === sale.productId)
        .sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime())[0]; // Get furthest expiry
    if (targetBatch) {
        targetBatch.quantity += sale.quantitySold;
    }
    else {
        batches.push({
            id: `b_rec_${Date.now()}`,
            productId: sale.productId,
            quantity: sale.quantitySold,
            expiryDate: "2026-12-31" // Arbitrary future date for recovered stock
        });
    }
    sales[saleIndex].status = "VOID";
};
export const editSale = (saleId, newQuantity) => {
    if (newQuantity <= 0)
        throw new Error("Quantity must be greater than 0");
    const sale = sales.find(s => s.id === saleId);
    if (!sale)
        throw new Error("Sale not found");
    if (sale.status === "VOID")
        throw new Error("Cannot edit a voided sale");
    const diff = newQuantity - sale.quantitySold;
    if (diff > 0) {
        // Check if we have enough stock for the increase
        const available = getAvailableQuantity(sale.productId);
        if (diff > available)
            throw new Error("Insufficient stock available to increase sale quantity.");
        // Deduct the difference using our standard deduct logic (simulated by creating a temp sale and throwing it away, but keeping the batch side effects)
        let productBatches = batches
            .filter(b => b.productId === sale.productId && b.quantity > 0 && new Date(b.expiryDate) >= new Date())
            .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
        let remainingToDeduct = diff;
        for (const batch of productBatches) {
            if (remainingToDeduct === 0)
                break;
            const batchRef = batches.find(b => b.id === batch.id);
            if (batchRef) {
                if (batchRef.quantity >= remainingToDeduct) {
                    batchRef.quantity -= remainingToDeduct;
                    remainingToDeduct = 0;
                }
                else {
                    remainingToDeduct -= batchRef.quantity;
                    batchRef.quantity = 0;
                }
            }
        }
    }
    else if (diff < 0) {
        // We need to add stock back
        let targetBatch = batches
            .filter(b => b.productId === sale.productId)
            .sort((a, b) => new Date(b.expiryDate).getTime() - new Date(a.expiryDate).getTime())[0];
        if (targetBatch) {
            targetBatch.quantity += Math.abs(diff);
        }
    }
    sale.quantitySold = newQuantity;
};
