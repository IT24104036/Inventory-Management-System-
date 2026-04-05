import { motion as Motion } from "framer-motion";
import {
    AlertTriangle,
    CheckCircle2,
    Clock,
    Edit2,
    FileText,
    Package,
    Plus,
    RotateCcw,
    Search,
    ShoppingCart,
    Trash2,
    X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime, formatTime, groupBills, statusBadge } from "./salesUtils";

export function SalesSummaryCards({ bgCard, textLabel, textValue, todayCount, todayQuantity }) {
    const items = [
        {
            label: "Today's Bills",
            value: todayCount,
            color: "text-[#007A5E]",
            bg: "bg-[#007A5E]/10",
            Icon: ShoppingCart,
        },
        {
            label: "Units Sold Today",
            value: todayQuantity,
            color: "text-[#7C3AED]",
            bg: "bg-[#7C3AED]/10",
            Icon: Clock,
        },
    ];

    return (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item, index) => (
                <Motion.div
                    key={item.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`${bgCard} rounded-[2rem] p-6`}
                >
                    <div className="mb-4 flex items-start justify-between">
                        <div className={`rounded-2xl p-3 ${item.bg} ${item.color}`}>
                            <item.Icon size={24} />
                        </div>
                    </div>
                    <p className={`mb-1 text-xs font-black uppercase tracking-widest ${textLabel}`}>{item.label}</p>
                    <h3 className={`text-4xl font-black ${textValue}`}>{item.value}</h3>
                </Motion.div>
            ))}
        </div>
    );
}

export function SalesOversightCard({ bgCard, isDark, textValue }) {
    return (
        <Card className={`${bgCard} rounded-[2rem] border-dashed border-2 p-6 ${isDark ? "border-white/10" : "border-[#0F172A]/10"}`}>
            <CardHeader className="mb-3 p-0">
                <CardTitle className={`text-lg font-black ${textValue}`}>Sales Oversight</CardTitle>
                <CardDescription className="text-xs font-bold">
                    Full history access — use the <span className="font-black">All Bills</span> tab to view and edit any bill.
                </CardDescription>
            </CardHeader>
        </Card>
    );
}

export function PosFormCard({
    bgCard,
    billTotal,
    amountGiven,
    amountGivenNum,
    customerEmail,
    customerName,
    handleRecordSale,
    inputBg,
    isDark,
    isFormValid,
    items,
    lineTotals,
    maxReasonablePayment,
    notes,
    productPickerOpener,
    productsById,
    quickPickAmounts,
    saleDate,
    saleSubmitting,
    sendReceipt,
    setAmountGiven,
    setCustomerEmail,
    setCustomerName,
    setItems,
    setNotes,
    setSendReceipt,
    stockMap,
    textLabel,
    textValue,
}) {
    return (
        <Card className={`${bgCard} overflow-hidden p-0`}>
            <CardHeader className={`border-b p-6 ${isDark ? "border-white/5" : "border-[#0F172A]/5"}`}>
                <CardTitle className={`text-xl font-black ${textValue}`}>Record New Sale (POS)</CardTitle>
                <CardDescription className="font-bold">
                    Add multiple products to one bill. Stock deducted via FEFO.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 p-6">
                <form onSubmit={(event) => handleRecordSale(event, false)} className="space-y-5">
                    <div className="space-y-3">
                        {items.map((item, index) => {
                            const currentStock = stockMap[item.productId] || 0;
                            const product = productsById[item.productId];
                            const lineTotal = lineTotals[index];
                            const hasPreviewDiscount = product && typeof item.quantity === "number"
                                && lineTotal + 0.001 < (product.sellingPrice ?? 0) * item.quantity;

                            return (
                                <div key={item.id} className="space-y-3 rounded-2xl border border-gray-200/60 bg-white/40 p-4">
                                    <div className="flex items-center justify-between gap-2">
                                        <Label className={`text-xs font-black uppercase tracking-widest ${textLabel}`}>Line {index + 1}</Label>
                                        {items.length > 1 ? (
                                            <button
                                                type="button"
                                                onClick={() => setItems((prev) => prev.filter((entry) => entry.id !== item.id))}
                                                className="text-xs font-black uppercase tracking-widest text-red-500 hover:text-red-600"
                                            >
                                                Remove
                                            </button>
                                        ) : null}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => productPickerOpener(item.id, "pos")}
                                        className={`flex h-12 w-full items-center justify-between rounded-2xl border px-4 text-left font-bold ${inputBg}`}
                                    >
                                        <span className={`truncate text-base ${item.productId ? textValue : "text-[#0F172A]/30"}`}>
                                            {item.productId ? (productsById[item.productId]?.name ?? "Choose product...") : "Choose product..."}
                                        </span>
                                        <Search size={16} className="ml-2 flex-shrink-0 text-[#0F172A]/30" />
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            type="number"
                                            min="1"
                                            className={`h-12 rounded-2xl text-base ${inputBg}`}
                                            placeholder="Qty"
                                            value={item.quantity}
                                            onChange={(event) => setItems((prev) => prev.map((entry) => (
                                                entry.id === item.id
                                                    ? { ...entry, quantity: event.target.value ? parseInt(event.target.value, 10) : "" }
                                                    : entry
                                            )))}
                                        />
                                        <div className="flex-1 text-right">
                                            <div className={`text-xs font-bold ${textLabel}`}>Line Total</div>
                                            {hasPreviewDiscount ? (
                                                <div className="text-sm font-black text-[#007A5E]">Batch discount applied</div>
                                            ) : null}
                                            <div className={`text-lg font-black ${textValue}`}>Rs {lineTotal.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    {item.productId && typeof item.quantity === "number" && item.quantity > currentStock ? (
                                        <p className="flex items-center gap-1 text-sm font-bold text-red-500">
                                            <AlertTriangle size={14} /> Only {currentStock} units available.
                                        </p>
                                    ) : null}
                                    {item.productId ? (
                                        <p className={`text-xs font-bold opacity-70 ${textLabel}`}>
                                            Stock: <span className="font-black">{currentStock}</span> •
                                            Base Price: <span className="font-black">Rs {product?.sellingPrice.toFixed(2) ?? "0.00"}</span>
                                        </p>
                                    ) : null}
                                </div>
                            );
                        })}
                        {(() => {
                            const last = items[items.length - 1];
                            const canAddLine = last.productId && typeof last.quantity === "number" && last.quantity > 0;
                            return (
                                <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!canAddLine}
                                    className="h-11 w-full rounded-2xl font-black text-sm disabled:opacity-40"
                                    onClick={() => setItems((prev) => [...prev, { id: String(Date.now()), productId: "", quantity: "" }])}
                                >
                                    <Plus size={15} className="mr-2" /> Add Another Product
                                </Button>
                            );
                        })()}
                    </div>

                    <div className="space-y-2">
                        <Label className={`ml-1 text-xs font-black uppercase tracking-widest ${textLabel}`}>
                            Date of Sale <span className="text-xs normal-case opacity-50">(today only)</span>
                        </Label>
                        <Input type="date" className={`h-12 cursor-not-allowed rounded-2xl text-base opacity-70 ${inputBg}`} value={saleDate} readOnly onChange={() => {}} />
                    </div>

                    <div className="space-y-2">
                        <Label className={`ml-1 text-xs font-black uppercase tracking-widest ${textLabel}`}>Reference / Notes (Optional)</Label>
                        <Input
                            className={`h-12 rounded-2xl text-base ${inputBg}`}
                            placeholder="Invoice # or details..."
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                        />
                    </div>

                    <div className="space-y-3 border-t border-gray-200/60 pt-4">
                        <div className="ml-1 flex items-center justify-between">
                            <Label className={`text-xs font-black uppercase tracking-widest ${textLabel}`}>Customer (Optional)</Label>
                            <span className={`text-xs font-bold ${customerName.length > 18 ? "text-red-500" : textLabel}`}>{customerName.length}/20</span>
                        </div>
                        <Input
                            className={`h-12 rounded-2xl text-base ${inputBg} ${customerName.length > 20 ? "border-red-400" : ""}`}
                            placeholder="Customer name"
                            maxLength={20}
                            value={customerName}
                            onChange={(event) => setCustomerName(event.target.value)}
                        />
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                id="sendReceipt"
                                checked={sendReceipt}
                                onChange={(event) => setSendReceipt(event.target.checked)}
                                className="h-4 w-4 rounded accent-[#007A5E]"
                            />
                            <label htmlFor="sendReceipt" className={`cursor-pointer text-sm font-bold ${textLabel}`}>
                                Send receipt to email
                            </label>
                        </div>
                        {sendReceipt ? (
                            <Input
                                type="email"
                                className={`h-12 rounded-2xl text-base ${inputBg}`}
                                placeholder="customer@email.com"
                                value={customerEmail}
                                onChange={(event) => setCustomerEmail(event.target.value)}
                            />
                        ) : null}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div className={`text-sm font-black uppercase tracking-widest ${textLabel}`}>Bill Total</div>
                        <div className={`text-3xl font-black ${textValue}`}>Rs {billTotal.toFixed(2)}</div>
                    </div>
                    <div className="space-y-3 border-t border-gray-200/60 pt-3">
                        <div className="ml-1 flex items-center justify-between">
                            <Label className={`text-xs font-black uppercase tracking-widest ${textLabel}`}>Amount Given by Customer</Label>
                            <span className={`text-xs font-bold ${textLabel}`}>Max Rs {maxReasonablePayment.toLocaleString()}</span>
                        </div>
                        {billTotal > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {quickPickAmounts.map((amount) => (
                                    <button
                                        key={amount}
                                        type="button"
                                        onClick={() => setAmountGiven(String(amount))}
                                        className={`rounded-xl border px-4 py-2 text-sm font-black transition-all ${
                                            parseFloat(amountGiven) === amount
                                                ? "border-[#007A5E] bg-[#007A5E] text-white"
                                                : `${inputBg} border-gray-200/60 ${textLabel} hover:border-[#007A5E]/40 hover:text-[#007A5E]`
                                        }`}
                                    >
                                        Rs {amount.toLocaleString()}
                                    </button>
                                ))}
                            </div>
                        ) : null}
                        <Input
                            type="number"
                            min={billTotal}
                            max={maxReasonablePayment}
                            step="1"
                            className={`h-12 rounded-2xl text-base ${inputBg} ${
                                amountGiven !== "" && !Number.isNaN(amountGivenNum) && amountGivenNum > maxReasonablePayment
                                    ? "border-red-400"
                                    : ""
                            }`}
                            placeholder="Enter amount..."
                            value={amountGiven}
                            onChange={(event) => setAmountGiven(event.target.value)}
                        />
                        {amountGiven !== "" && !Number.isNaN(amountGivenNum) ? (
                            amountGivenNum > maxReasonablePayment ? (
                                <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                                    <span className="text-sm font-black uppercase tracking-widest text-red-500">Exceeds Max Note</span>
                                    <span className="text-base font-black text-red-600">Max Rs {maxReasonablePayment.toLocaleString()}</span>
                                </div>
                            ) : amountGivenNum < billTotal ? (
                                <div className="flex items-center justify-between rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
                                    <span className="text-sm font-black uppercase tracking-widest text-red-500">Amount Short</span>
                                    <span className="text-2xl font-black text-red-600">Rs {(billTotal - amountGivenNum).toFixed(2)}</span>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                                    <span className="text-sm font-black uppercase tracking-widest text-emerald-600">Change to Return</span>
                                    <span className="text-2xl font-black text-emerald-700">Rs {(amountGivenNum - billTotal).toFixed(2)}</span>
                                </div>
                            )
                        ) : null}
                    </div>

                    <Button
                        type="submit"
                        disabled={!isFormValid || saleSubmitting}
                        className="mt-2 w-full rounded-2xl bg-[#007A5E] py-6 font-black text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                        <CheckCircle2 size={18} className="mr-2" /> {saleSubmitting ? "Recording..." : "Record POS Bill"}
                    </Button>
                    <Button
                        type="button"
                        disabled={!isFormValid || saleSubmitting}
                        variant="outline"
                        onClick={(event) => handleRecordSale(event, true)}
                        className="w-full rounded-2xl py-5 font-black text-sm"
                    >
                        <FileText size={16} className="mr-2" /> {saleSubmitting ? "Saving Draft..." : "Save as Draft"}
                    </Button>

                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                            setItems([{ id: "1", productId: "", quantity: "" }]);
                            setAmountGiven("");
                            setNotes("");
                            setCustomerName("");
                            setCustomerEmail("");
                            setSendReceipt(false);
                        }}
                        className={`w-full rounded-2xl border border-dashed border-gray-300 py-4 font-black text-sm transition-all hover:border-red-400 hover:bg-red-50 hover:text-red-500 ${textLabel}`}
                    >
                        <RotateCcw size={15} className="mr-2" /> Clear POS
                    </Button>

                    <p className={`mt-2 text-center text-[10px] font-bold uppercase tracking-widest ${textLabel}`}>
                        Stock deducted from earliest-expiry batch (FEFO).
                    </p>
                </form>
            </CardContent>
        </Card>
    );
}

export function SalesHistoryCard({
    bgCard,
    currentUsername,
    displaySales,
    filterDateError,
    filterDateFrom,
    filterDateTo,
    filterSearch,
    filterStatus,
    inputBg,
    isDark,
    isManager,
    isStaff,
    salesTab,
    sortBy,
    textLabel,
    textValue,
    canEditThisSale,
    editWindowExpired,
    finalizingBillId,
    getEditTimeLeft,
    onClearFilters,
    onFilterDateFromChange,
    onFilterDateToChange,
    onFilterSearchChange,
    onFilterStatusChange,
    onFinalizeDraft,
    onOpenBillDetails,
    onOpenFullEdit,
    onOpenUnvoid,
    onOpenVoid,
    onSalesTabChange,
    onSortByChange,
}) {
    const bills = groupBills(displaySales);

    return (
        <Card className={`${bgCard} overflow-hidden p-0`}>
            <CardHeader className={`flex-col items-start gap-4 border-b p-6 ${isDark ? "border-white/5" : "border-[#0F172A]/5"}`}>
                <div className="flex w-full items-center justify-between">
                    <div>
                        <CardTitle className={`text-xl font-black ${textValue}`}>
                            {salesTab === "all" ? "All Bills" : "My Sales"}
                        </CardTitle>
                        <CardDescription className="font-bold">
                            {salesTab === "all" ? "All bills from every user — full edit access." : "Your own transaction records."}
                        </CardDescription>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => onSalesTabChange("mine")}
                        className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                            salesTab === "mine"
                                ? "bg-[#007A5E] text-white shadow-sm"
                                : `${isDark ? "text-white/40 hover:bg-white/10 hover:text-white" : "text-[#0F172A]/40 hover:bg-[#0F172A]/5 hover:text-[#0F172A]"}`
                        }`}
                    >
                        My Sales
                    </button>
                    {isManager ? (
                        <button
                            type="button"
                            onClick={() => onSalesTabChange("all")}
                            className={`rounded-2xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all ${
                                salesTab === "all"
                                    ? "bg-[#7C3AED] text-white shadow-sm"
                                    : `${isDark ? "text-white/40 hover:bg-white/10 hover:text-white" : "text-[#0F172A]/40 hover:bg-[#0F172A]/5 hover:text-[#0F172A]"}`
                            }`}
                        >
                            All Bills
                        </button>
                    ) : null}
                </div>
            </CardHeader>
            <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
                <Input
                    placeholder="Search product..."
                    className={`h-10 w-32 rounded-2xl lg:w-40 ${inputBg}`}
                    value={filterSearch}
                    onChange={(event) => onFilterSearchChange(event.target.value)}
                />
                <Select value={filterStatus} onValueChange={onFilterStatusChange}>
                    <SelectTrigger className={`h-10 w-32 rounded-2xl font-bold ${inputBg}`}>
                        <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                        <SelectItem value="ALL">All Status</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="VOID">Voided</SelectItem>
                        {isManager ? <SelectItem value="EDITED">Edited Only</SelectItem> : null}
                    </SelectContent>
                </Select>
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                        <Input
                            type="date"
                            className={`h-10 w-36 rounded-2xl ${inputBg}`}
                            value={filterDateFrom}
                            onChange={(event) => onFilterDateFromChange(event.target.value)}
                        />
                        <span className={`text-[11px] font-bold ${textLabel}`}>–</span>
                        <Input
                            type="date"
                            className={`h-10 w-36 rounded-2xl ${inputBg}`}
                            value={filterDateTo}
                            onChange={(event) => onFilterDateToChange(event.target.value)}
                        />
                    </div>
                    {filterDateError ? (
                        <p className="flex items-center gap-1 px-1 text-[10px] font-bold text-red-500">
                            <AlertTriangle size={10} /> {filterDateError}
                        </p>
                    ) : null}
                </div>
                <Select value={sortBy} onValueChange={onSortByChange}>
                    <SelectTrigger className={`h-10 w-32 rounded-2xl font-bold ${inputBg}`}>
                        <SelectValue placeholder="Sort" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                        <SelectItem value="NEWEST">Newest</SelectItem>
                        <SelectItem value="PRODUCT">Product</SelectItem>
                        <SelectItem value="QUANTITY">Quantity</SelectItem>
                    </SelectContent>
                </Select>
                {(filterSearch || filterStatus !== "ALL" || filterDateFrom || filterDateTo || sortBy !== "NEWEST") ? (
                    <button
                        type="button"
                        onClick={onClearFilters}
                        className="flex h-10 items-center gap-1.5 rounded-2xl border border-dashed border-red-300 px-3 text-xs font-black uppercase tracking-widest text-red-500 transition-all hover:border-red-500 hover:bg-red-50"
                    >
                        <RotateCcw size={12} /> Clear Filters
                    </button>
                ) : null}
            </div>
            <CardContent className="p-0">
                <Table>
                    <TableHeader className={isStaff ? "bg-[#4E342E]/[0.02]" : "bg-[#0F172A]/[0.02]"}>
                        <TableRow className={isStaff ? "border-[#4E342E]/5" : "border-[#0F172A]/5"}>
                            <TableHead className="px-6 text-[10px] font-black uppercase tracking-widest">Bill / Line</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Product</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Qty</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Amount</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Date</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                            <TableHead className="px-6 text-right text-[10px] font-black uppercase tracking-widest">Action</TableHead>
                            {!isManager ? <TableHead className="text-[10px] font-black uppercase tracking-widest text-[#007A5E]">Edit Window</TableHead> : null}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {bills.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isManager ? 7 : 8} className="py-12 text-center">
                                    <p className={`${textLabel} text-sm font-bold`}>No sales found.</p>
                                </TableCell>
                            </TableRow>
                        ) : bills.map(({ billId, lines, displayLines, billStatus, totalAmount, totalQty, rep }) => (
                            <TableRow
                                key={billId}
                                className={`${isStaff ? "border-[#4E342E]/5 hover:bg-[#4E342E]/[0.02]" : "border-[#0F172A]/5 hover:bg-primary/[0.03]"} transition-colors ${billStatus === "VOID" ? "opacity-50" : ""}`}
                            >
                                <TableCell className="px-6 py-4">
                                    <button type="button" onClick={() => onOpenBillDetails(billId)} className="text-left">
                                        <p className={`text-[11px] font-black underline ${textValue}`}>{billId}</p>
                                        <p className={`text-[10px] font-bold uppercase ${textLabel}`}>View Bill</p>
                                    </button>
                                </TableCell>
                                <TableCell>
                                    {displayLines.length === 1 ? (
                                        <>
                                            <p className={`font-black ${textValue}`}>{displayLines[0].productName}</p>
                                            <p className={`text-[10px] font-bold uppercase ${textLabel}`}>
                                                {rep.recordedBy}
                                                {rep.lastEditedBy ? <span className="text-[#7C3AED]"> • edited by {rep.lastEditedBy}</span> : null}
                                            </p>
                                        </>
                                    ) : (
                                        <>
                                            <p className={`text-sm font-black ${textValue}`}>{displayLines.map((line) => line.productName).join(", ")}</p>
                                            <p className={`text-[10px] font-bold uppercase ${textLabel}`}>
                                                {displayLines.length} items • {rep.recordedBy}
                                                {rep.lastEditedBy ? <span className="text-[#7C3AED]"> • edited by {rep.lastEditedBy}</span> : null}
                                            </p>
                                        </>
                                    )}
                                </TableCell>
                                <TableCell className="text-lg font-bold">{totalQty}</TableCell>
                                <TableCell className="text-sm font-bold">Rs {totalAmount.toFixed(2)}</TableCell>
                                <TableCell className={`text-sm font-bold ${textLabel}`}>
                                    <p>{rep.saleDate}</p>
                                    {rep.createdAt ? <p className="text-[10px] font-black text-[#007A5E]">{formatTime(rep.createdAt)}</p> : null}
                                </TableCell>
                                <TableCell>
                                    <Badge className={`rounded-lg border-none px-2 text-[10px] font-black uppercase tracking-widest ${statusBadge(billStatus)}`}>
                                        {billStatus}
                                    </Badge>
                                </TableCell>
                                <TableCell className="px-6 text-right">
                                    {billStatus === "DRAFT" ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                disabled={finalizingBillId === billId}
                                                onClick={() => onFinalizeDraft(billId)}
                                                className="rounded-xl border-yellow-300 text-xs font-black text-yellow-700 hover:bg-yellow-50"
                                            >
                                                {finalizingBillId === billId ? "Finalizing..." : "Finalize"}
                                            </Button>
                                    ) : billStatus === "VOID" ? (
                                        isManager ? (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => onOpenUnvoid(lines[0])}
                                                className="rounded-xl border-[#007A5E]/40 text-xs font-black text-[#007A5E] hover:bg-[#007A5E]/10"
                                            >
                                                Unvoid
                                            </Button>
                                        ) : null
                                    ) : (
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                disabled={!canEditThisSale(rep)}
                                                onClick={() => onOpenFullEdit(billId)}
                                                title={editWindowExpired(rep) ? "Edit window expired (2h). Contact manager." : "Edit Bill"}
                                                className={`${textLabel} rounded-xl transition-all hover:bg-[#007A5E]/10 hover:text-[#007A5E]`}
                                            >
                                                <Edit2 size={16} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                disabled={!canEditThisSale(rep)}
                                                onClick={() => onOpenVoid(lines.filter((line) => line.status !== "VOID").map((line) => line.id))}
                                                title={editWindowExpired(rep) ? "Void window expired (2h). Contact manager." : "Void Bill"}
                                                className={`${textLabel} rounded-xl transition-all hover:bg-red-500/10 hover:text-red-500`}
                                            >
                                                <Trash2 size={16} />
                                            </Button>
                                        </div>
                                    )}
                                </TableCell>
                                {!isManager ? (() => {
                                    const timeLeft = getEditTimeLeft(rep);
                                    const expired = editWindowExpired(rep);
                                    const isOwn = rep.recordedBy === currentUsername;
                                    if (!isOwn || billStatus === "VOID") return <TableCell />;
                                    const isUrgent = timeLeft && !timeLeft.includes("h") && parseInt(timeLeft, 10) <= 30;
                                    return (
                                        <TableCell>
                                            {timeLeft ? (
                                                <span className={`rounded-lg px-2 py-1 text-[11px] font-black ${isUrgent ? "bg-red-50 text-red-500" : "bg-[#007A5E]/10 text-[#007A5E]"}`}>
                                                    ⏱ {timeLeft}
                                                </span>
                                            ) : expired ? (
                                                <span className="text-[11px] font-black text-gray-400">Expired</span>
                                            ) : null}
                                        </TableCell>
                                    );
                                })() : null}
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

export function VoidSaleDialog({ inputBg, open, reason, reasonError, saving, textLabel, onClose, onConfirm, onReasonChange }) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white p-8 text-slate-900">
                <DialogHeader className="mb-4">
                    <DialogTitle className="flex items-center gap-2 text-xl font-black tracking-tight">
                        <AlertTriangle size={18} className="text-red-500" /> Confirm Void
                    </DialogTitle>
                    <DialogDescription className={`text-sm font-bold ${textLabel}`}>
                        This will mark the transaction as <span className="font-black text-gray-700">VOID</span>. Stock will be restored to inventory, the record is preserved for audit, and it will be excluded from reports and AI analysis.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <Label className={`ml-1 text-[10px] font-black uppercase tracking-widest ${textLabel}`}>
                        Void Reason <span className="text-red-500">*</span>
                    </Label>
                    <div className="flex flex-wrap gap-2">
                        {["Customer cancelled", "Wrong product recorded", "Duplicate entry"].map((chip) => (
                            <button
                                key={chip}
                                type="button"
                                onClick={() => onReasonChange(chip, true)}
                                className={`rounded-full border px-3 py-1.5 text-[11px] font-black transition-all ${
                                    reason === chip
                                        ? "border-red-600 bg-red-600 text-white"
                                        : "border-gray-300 text-gray-600 hover:border-red-400 hover:text-red-600"
                                }`}
                            >
                                {chip}
                            </button>
                        ))}
                    </div>
                    <Input
                        className={`h-12 rounded-2xl ${inputBg} ${reasonError ? "border-red-400" : ""}`}
                        placeholder="Or type a custom reason..."
                        value={reason}
                        onChange={(event) => onReasonChange(event.target.value)}
                    />
                    {reasonError ? <p className="ml-1 text-xs font-bold text-red-500">{reasonError}</p> : null}
                </div>
                <DialogFooter className="gap-2 pt-6">
                    <Button variant="ghost" onClick={() => onClose(false)} className={`rounded-2xl py-6 text-sm font-black hover:bg-black/5 ${textLabel}`}>
                        Cancel
                    </Button>
                    <Button disabled={saving} onClick={onConfirm} className="flex-1 rounded-2xl bg-red-600 py-6 text-sm font-black text-white hover:scale-[1.02]">
                        {saving ? "Voiding..." : "Confirm Void"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function UnvoidSaleDialog({ inputBg, open, reason, reasonError, saving, target, textLabel, onClose, onConfirm, onReasonChange }) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md bg-white p-8 text-slate-900">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-black tracking-tight">Unvoid Sale</DialogTitle>
                    <DialogDescription className={`text-sm font-bold ${textLabel}`}>
                        This will restore the sale to <span className="font-black text-[#007A5E]">ACTIVE</span> and re-deduct stock using FEFO. The original void record will be preserved.
                    </DialogDescription>
                </DialogHeader>
                {target ? (
                    <div className="space-y-3">
                        <div className="space-y-1 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm">
                            <p className="mb-2 text-xs font-black uppercase tracking-widest text-gray-400">Original Void Info</p>
                            <p className="font-bold text-gray-700">Voided by: <span className="font-black text-gray-900">{target.voidedBy || "—"}</span></p>
                            <p className="font-bold text-gray-700">Reason: <span className="font-black text-gray-900">{target.voidReason || "—"}</span></p>
                            <p className="mt-2 font-bold text-gray-700">
                                Stock impact: <span className="font-black text-red-600">{target.quantitySold} unit(s) of {target.productName} will be re-deducted</span>
                            </p>
                        </div>
                        <Label className={`ml-1 text-[10px] font-black uppercase tracking-widest ${textLabel}`}>
                            Reason for Unvoid <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            className={`h-12 rounded-2xl ${inputBg} ${reasonError ? "border-red-400" : ""}`}
                            placeholder="State why this sale is being reinstated..."
                            value={reason}
                            onChange={(event) => onReasonChange(event.target.value)}
                        />
                        {reasonError ? <p className="ml-1 text-xs font-bold text-red-500">{reasonError}</p> : null}
                    </div>
                ) : null}
                <DialogFooter className="gap-2 pt-6">
                    <Button variant="ghost" onClick={() => onClose(false)} className={`rounded-2xl py-6 text-sm font-black hover:bg-black/5 ${textLabel}`}>
                        Cancel
                    </Button>
                    <Button disabled={saving} onClick={onConfirm} className="flex-1 rounded-2xl bg-[#007A5E] py-6 text-sm font-black text-white hover:scale-[1.02]">
                        {saving ? "Reinstating..." : "Confirm Unvoid"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export function BillDetailsDialog({
    open,
    selectedBillActive,
    selectedBillId,
    selectedBillLines,
    textLabel,
    textValue,
    onClose,
}) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-lg overflow-hidden bg-white p-0 text-slate-900">
                <div className="bg-gradient-to-br from-[#007A5E] to-[#0F172A] p-6 text-white">
                    <div className="flex items-start justify-between">
                        <div>
                            <p className="mb-1 text-[10px] font-black uppercase tracking-widest opacity-60">Invigo FreshGuard</p>
                            <h2 className="text-2xl font-black tracking-tight">INVOICE</h2>
                            <p className="mt-1 text-sm font-bold opacity-70">{selectedBillId}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Date</p>
                            <p className="text-sm font-bold">{selectedBillActive[0]?.saleDate || selectedBillLines[0]?.saleDate || "—"}</p>
                            {(selectedBillActive[0]?.customerName || selectedBillLines[0]?.customerName) ? (
                                <div className="mt-2">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Customer</p>
                                    <p className="text-sm font-bold">{selectedBillActive[0]?.customerName || selectedBillLines[0]?.customerName}</p>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="max-h-[65vh] space-y-5 overflow-y-auto p-6">
                    {selectedBillLines.length === 0 ? (
                        <p className={`${textLabel} text-sm font-bold`}>No lines found for this bill.</p>
                    ) : (() => {
                        const currentLines = selectedBillActive.length > 0 ? selectedBillActive : selectedBillLines;
                        const invoiceTotal = currentLines.reduce((sum, line) => sum + (line.lineTotal ?? 0), 0);
                        const replacedVoids = selectedBillLines.filter((line) => line.status === "VOID" && line.voidReason?.startsWith("Bill replaced"));
                        const editEventMap = new Map();
                        replacedVoids.forEach((line) => {
                            const key = `${line.voidedBy}||${line.voidReason}||${(line.voidedAt || "").substring(0, 16)}`;
                            if (!editEventMap.has(key)) editEventMap.set(key, []);
                            editEventMap.get(key).push(line);
                        });
                        const editEvents = Array.from(editEventMap.entries())
                            .map(([, lines]) => ({
                                editedBy: lines[0].voidedBy,
                                editedAt: lines[0].voidedAt,
                                reason: (lines[0].voidReason || "").replace("Bill replaced - ", "").replace("Bill replaced", "").trim(),
                                prevLines: lines,
                            }))
                            .sort((a, b) => new Date(b.editedAt) - new Date(a.editedAt));
                        const directVoidLine = selectedBillLines.find((line) => line.status === "VOID" && line.voidedBy && !line.voidReason?.startsWith("Bill replaced"));

                        return (
                            <>
                                <div className="overflow-hidden rounded-2xl border border-gray-200/60">
                                    <Table>
                                        <TableHeader className="bg-gray-50/80">
                                            <TableRow className="border-gray-200/60">
                                                <TableHead className="px-4 py-3 text-[10px] font-black uppercase tracking-widest">Product</TableHead>
                                                <TableHead className="py-3 text-center text-[10px] font-black uppercase tracking-widest">Qty</TableHead>
                                                <TableHead className="py-3 text-right text-[10px] font-black uppercase tracking-widest">Unit Price</TableHead>
                                                <TableHead className="px-4 py-3 text-right text-[10px] font-black uppercase tracking-widest">Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {currentLines.map((line) => (
                                                <TableRow key={line.id} className="border-gray-200/40">
                                                    <TableCell className="px-4 py-3">
                                                        <p className={`text-sm font-black ${textValue}`}>{line.productName}</p>
                                                        {line.batchNumber ? (
                                                            <p className={`text-[10px] font-bold ${textLabel}`}>
                                                                Batch {line.batchNumber}{line.batchExpiryDate ? ` · exp ${line.batchExpiryDate}` : ""}
                                                            </p>
                                                        ) : null}
                                                        {line.discountRate > 0 ? (
                                                            <span className="rounded-full bg-[#007A5E]/10 px-2 py-0.5 text-[10px] font-black text-[#007A5E]">
                                                                -{line.discountRate}% OFF
                                                            </span>
                                                        ) : null}
                                                    </TableCell>
                                                    <TableCell className="py-3 text-center text-sm font-bold">{line.quantitySold}</TableCell>
                                                    <TableCell className="py-3 text-right text-sm font-bold">Rs {(line.unitPrice ?? 0).toFixed(2)}</TableCell>
                                                    <TableCell className="px-4 py-3 text-right text-sm font-black">Rs {(line.lineTotal ?? 0).toFixed(2)}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                <div className="flex items-center justify-between border-t-2 border-[#007A5E] px-1 pt-1">
                                    <span className={`text-base font-black ${textValue}`}>Grand Total</span>
                                    <span className="text-2xl font-black text-[#007A5E]">Rs {invoiceTotal.toFixed(2)}</span>
                                </div>

                                {currentLines[0]?.notes ? <p className={`text-[11px] font-bold ${textLabel}`}>Notes: {currentLines[0].notes}</p> : null}

                                <div className="space-y-1 rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-400">Bill Info</p>
                                    <div className="flex justify-between text-[11px] font-bold text-gray-600">
                                        <span>Created by <span className="font-black text-[#007A5E]">{currentLines[0]?.recordedBy || "—"}</span></span>
                                        <span className="text-right text-gray-400">
                                            <span className="block">{currentLines[0]?.saleDate || "—"}</span>
                                            {currentLines[0]?.createdAt ? <span className="block font-black text-[#007A5E]">{formatTime(currentLines[0].createdAt)}</span> : null}
                                        </span>
                                    </div>
                                    {currentLines[0]?.lastEditedBy ? (
                                        <div className="flex justify-between text-[11px] font-bold text-gray-600">
                                            <span>Last edited by <span className="font-black text-[#7C3AED]">{currentLines[0].lastEditedBy}</span></span>
                                            <span className="text-gray-400">{currentLines[0].editedAt ? formatDateTime(currentLines[0].editedAt) : ""}</span>
                                        </div>
                                    ) : null}
                                    {directVoidLine ? (
                                        <div className="flex justify-between text-[11px] font-bold text-red-500">
                                            <span>Voided by <span className="font-black">{directVoidLine.voidedBy}</span>{directVoidLine.voidReason ? ` — ${directVoidLine.voidReason}` : ""}</span>
                                            <span className="text-gray-400">{directVoidLine.voidedAt ? formatDateTime(directVoidLine.voidedAt) : ""}</span>
                                        </div>
                                    ) : null}
                                </div>

                                {editEvents.length > 0 ? (
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Edit History</p>
                                        {editEvents.map((event, index) => (
                                            <div key={index} className="overflow-hidden rounded-xl border border-gray-200/60 bg-white">
                                                <div className="flex items-center justify-between border-b border-[#7C3AED]/10 bg-[#7C3AED]/5 px-4 py-2">
                                                    <span className="text-[11px] font-black text-[#7C3AED]">Edited by {event.editedBy}</span>
                                                    <span className="text-[10px] text-gray-400">{event.editedAt ? formatDateTime(event.editedAt) : "—"}</span>
                                                </div>
                                                {event.reason ? (
                                                    <p className="border-b border-gray-100 px-4 py-1.5 text-[10px] font-bold text-gray-500">
                                                        Reason: <span className="text-gray-700">{event.reason}</span>
                                                    </p>
                                                ) : null}
                                                <div className="space-y-1 px-4 py-2">
                                                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-gray-400">Previous items</p>
                                                    {event.prevLines.map((line) => (
                                                        <div key={line.id} className="flex justify-between text-[11px] font-bold text-gray-500">
                                                            <span>{line.productName} × {line.quantitySold}</span>
                                                            <span>Rs {(line.lineTotal ?? 0).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                            </>
                        );
                    })()}

                    <DialogFooter className="pt-2">
                        <Button variant="ghost" onClick={() => onClose(false)} className={`rounded-2xl py-5 text-sm font-black hover:bg-black/5 ${textLabel}`}>
                            Close
                        </Button>
                    </DialogFooter>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function FullBillEditDialog({
    editBillDate,
    editBillCustomerEmail,
    editBillCustomerName,
    editBillGroupId,
    editBillItems,
    editBillNotes,
    editBillPricingPreview,
    editBillReason,
    editBillSaving,
    getExpiredItemStock,
    getItemCurrentStock,
    getEditableBillStock,
    getProductById,
    _inputBg,
    open,
    productPickerOpener,
    setEditBillCustomerEmail,
    setEditBillCustomerName,
    setEditBillItems,
    setEditBillNotes,
    setEditBillReason,
    textLabel,
    textValue,
    onClose,
    onSave,
}) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="flex max-h-[92vh] max-w-xl flex-col overflow-hidden bg-white p-0 text-slate-900">
                <div className="flex-shrink-0 border-b border-gray-100 px-6 pb-4 pt-6">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 className="text-xl font-black tracking-tight text-[#0F172A]">Edit Bill</h2>
                            <p className={`mt-0.5 text-[11px] font-black uppercase tracking-widest ${textLabel}`}>{editBillGroupId}</p>
                        </div>
                        <div className="text-right">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>Date</p>
                            <p className={`text-sm font-black ${textValue}`}>{editBillDate}</p>
                            <p className="mt-0.5 text-[10px] font-bold text-gray-400">locked to today</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4">
                    <div className="space-y-3">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>Items</p>
                        {editBillItems.map((item, index) => {
                            const currentSellableStock = getItemCurrentStock(item.productId);
                            const expiredStock = getExpiredItemStock(item.productId);
                            const effectiveStock = getEditableBillStock(item.productId);
                            const freedQty = Math.max(0, effectiveStock - currentSellableStock);
                            const lineTotal = editBillPricingPreview.lineTotals[index] ?? 0;
                            const overStock = item.productId && typeof item.quantity === "number" && item.quantity > effectiveStock;
                            const blockedByExpiredStock = overStock && effectiveStock === 0 && expiredStock > 0;

                            return (
                                <div key={item.id} className={`space-y-2 rounded-2xl border p-3 ${overStock ? "border-red-200 bg-red-50/30" : "border-gray-200/60 bg-gray-50/40"}`}>
                                    <div className="flex items-center justify-between">
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>Line {index + 1}</span>
                                        {editBillItems.length > 1 ? (
                                            <button
                                                type="button"
                                                onClick={() => setEditBillItems((prev) => prev.filter((entry) => entry.id !== item.id))}
                                                className="text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-red-600"
                                            >
                                                Remove
                                            </button>
                                        ) : null}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => productPickerOpener(item.id, "edit")}
                                        className={`flex h-10 w-full items-center justify-between rounded-xl border bg-white px-3 text-left font-bold ${overStock ? "border-red-200" : "border-gray-200"}`}
                                    >
                                        <span className={`truncate text-sm ${item.productId ? textValue : "text-gray-300"}`}>
                                            {item.productId ? (getProductById(item.productId)?.name ?? "Choose product...") : "Choose product..."}
                                        </span>
                                        <Search size={13} className="ml-2 flex-shrink-0 text-gray-300" />
                                    </button>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            type="number"
                                            min="1"
                                            className={`h-9 flex-1 rounded-xl text-sm ${overStock ? "border-red-200 bg-red-50/40" : "border-gray-200 bg-white"}`}
                                            placeholder="Qty"
                                            value={item.quantity}
                                            onChange={(event) => setEditBillItems((prev) => prev.map((entry) => (
                                                entry.id === item.id
                                                    ? { ...entry, quantity: event.target.value ? parseInt(event.target.value, 10) : "" }
                                                    : entry
                                            )))}
                                        />
                                        <div className="min-w-[80px] text-right text-[11px] font-bold">
                                            <div className={`${textLabel} text-[10px]`}>Line Total</div>
                                            <div className={`text-sm font-black ${textValue}`}>Rs {lineTotal.toFixed(2)}</div>
                                        </div>
                                    </div>
                                    {item.productId ? (
                                        <div className="flex items-center justify-between">
                                            <p className={`text-[10px] font-bold ${overStock ? "text-red-500" : "text-gray-400"}`}>
                                                {overStock
                                                    ? (
                                                        blockedByExpiredStock
                                                            ? <><AlertTriangle size={10} className="mr-1 inline" />No sellable stock available. {expiredStock} expired unit{expiredStock === 1 ? "" : "s"} cannot be sold.</>
                                                            : <><AlertTriangle size={10} className="mr-1 inline" />Only {effectiveStock} available</>
                                                    )
                                                    : <>Avail: <span className="font-black text-[#007A5E]">{effectiveStock}</span> units{freedQty > 0 ? <span className="text-[#007A5E]/60"> (+{freedQty} freed)</span> : null}</>
                                                }
                                            </p>
                                        </div>
                                    ) : null}
                                </div>
                            );
                        })}
                        {(() => {
                            const lastLine = editBillItems[editBillItems.length - 1];
                            const canAddLine = lastLine.productId && typeof lastLine.quantity === "number" && lastLine.quantity > 0;
                            return (
                                <button
                                    type="button"
                                    disabled={!canAddLine}
                                    onClick={() => setEditBillItems((prev) => [...prev, { id: String(Date.now()), productId: "", quantity: "" }])}
                                    className={`w-full rounded-xl border border-dashed py-2.5 text-xs font-black uppercase tracking-widest transition-colors ${
                                        canAddLine
                                            ? `border-gray-300 ${textLabel} hover:border-[#007A5E] hover:text-[#007A5E]`
                                            : "cursor-not-allowed border-gray-200 text-gray-300 opacity-50"
                                    }`}
                                >
                                    + Add Another Product
                                </button>
                            );
                        })()}
                    </div>

                    <div className="space-y-1.5">
                        <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>Notes (Optional)</Label>
                        <Input
                            className="h-10 rounded-xl border-gray-200 bg-white text-sm"
                            placeholder="Any notes for this bill..."
                            value={editBillNotes}
                            onChange={(event) => setEditBillNotes(event.target.value)}
                        />
                    </div>

                    <div className="space-y-3 rounded-2xl border border-gray-200/60 bg-gray-50/40 p-4">
                        <div className="flex items-center justify-between">
                            <p className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>Customer (Optional)</p>
                            <span className={`text-[10px] font-bold ${editBillCustomerName.length > 18 ? "text-red-500" : "text-gray-400"}`}>
                                {editBillCustomerName.length}/20
                            </span>
                        </div>
                        <Input
                            className={`h-10 rounded-xl bg-white text-sm ${editBillCustomerName.length > 20 ? "border-red-400" : "border-gray-200"}`}
                            placeholder="Customer name"
                            maxLength={20}
                            value={editBillCustomerName}
                            onChange={(event) => setEditBillCustomerName(event.target.value)}
                        />
                        <Input
                            type="email"
                            className="h-10 rounded-xl border-gray-200 bg-white text-sm"
                            placeholder="Email address (receipt will be sent if filled)"
                            value={editBillCustomerEmail}
                            onChange={(event) => setEditBillCustomerEmail(event.target.value)}
                        />
                        {editBillCustomerEmail.trim() ? (
                            <p className="flex items-center gap-1 text-[11px] font-bold text-[#007A5E]">
                                <span className="text-[13px]">✉</span> Receipt will be emailed on save.
                            </p>
                        ) : null}
                    </div>

                    <div className="space-y-1.5">
                        <Label className={`text-[10px] font-black uppercase tracking-widest ${textLabel}`}>
                            Reason for Edit <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            className="h-10 rounded-xl border-gray-200 bg-white text-sm"
                            placeholder="e.g. Wrong product, corrected quantity..."
                            value={editBillReason}
                            onChange={(event) => setEditBillReason(event.target.value)}
                        />
                    </div>
                </div>

                <div className="flex-shrink-0 border-t border-gray-100 px-6 py-4">
                    <div className="mb-3 flex items-center justify-between">
                        <span className={`text-[11px] font-black uppercase tracking-widest ${textLabel}`}>New Total</span>
                        <span className={`text-2xl font-black ${textValue}`}>Rs {editBillPricingPreview.total.toFixed(2)}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" onClick={() => onClose(false)} className={`flex-1 rounded-2xl py-5 text-sm font-black hover:bg-black/5 ${textLabel}`}>
                            Cancel
                        </Button>
                        <Button disabled={editBillSaving || !editBillReason.trim()} onClick={onSave} className="flex-1 rounded-2xl bg-[#007A5E] py-5 text-sm font-black text-white transition-colors hover:bg-[#006B52]">
                            {editBillSaving ? "Saving..." : "Save Changes"}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function ProductPickerDialog({
    getNextFefoDiscountInfo,
    open,
    pickerSearch,
    products,
    stockMap,
    onClose,
    onPickProduct,
    onSearchChange,
}) {
    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent hideClose className="max-w-2xl overflow-hidden rounded-3xl border-none bg-white p-0 text-slate-900 shadow-2xl">
                <div className="bg-gradient-to-br from-[#007A5E] to-[#0F172A] px-6 py-5">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <p className="mb-0.5 text-[10px] font-black uppercase tracking-widest text-white/60">POS</p>
                            <h2 className="text-xl font-black tracking-tight text-white">Select Product</h2>
                        </div>
                        <button type="button" onClick={() => onClose(false)} className="rounded-xl p-1 text-white/60 transition-colors hover:bg-white/10 hover:text-white">
                            <X size={18} />
                        </button>
                    </div>
                    <div className="relative">
                        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                            type="text"
                            autoFocus
                            placeholder="Search by name or category..."
                            value={pickerSearch}
                            onChange={(event) => onSearchChange(event.target.value)}
                            className="h-10 w-full rounded-2xl border border-white/20 bg-white/10 pl-9 pr-4 text-sm font-bold text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/30"
                        />
                    </div>
                </div>

                <div className="max-h-[520px] space-y-2 overflow-y-auto p-4">
                    {(() => {
                        const query = pickerSearch.toLowerCase();
                        const allInStock = products.filter((product) => (stockMap[String(product.id)] ?? 0) > 0);
                        const availableProducts = allInStock.filter((product) =>
                            !query
                            || product.name.toLowerCase().includes(query)
                            || (product.category || "").toLowerCase().includes(query)
                        );
                        const previewCount = 5;
                        const showingAll = query.length > 0;
                        const visibleProducts = showingAll ? availableProducts : availableProducts.slice(0, previewCount);
                        const hiddenCount = availableProducts.length - previewCount;

                        if (products.length === 0) {
                            return (
                                <div className="flex flex-col items-center justify-center py-14 text-center">
                                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                                        <Package size={24} className="text-gray-400" />
                                    </div>
                                    <p className="text-sm font-black text-[#0F172A]/70">No products loaded</p>
                                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#0F172A]/40">Check backend connection</p>
                                </div>
                            );
                        }

                        if (availableProducts.length === 0) {
                            return (
                                <div className="flex flex-col items-center justify-center py-14 text-center">
                                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100">
                                        <Search size={24} className="text-gray-400" />
                                    </div>
                                    <p className="text-sm font-black text-[#0F172A]/70">{query ? "No matching products" : "No products in stock"}</p>
                                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#0F172A]/40">
                                        {query ? "Try a different search term" : "Add inventory batches first"}
                                    </p>
                                </div>
                            );
                        }

                        return (
                            <>
                                {visibleProducts.map((product) => {
                                    const stock = stockMap[String(product.id)] ?? 0;
                                    const isLow = stock <= 10;
                                    const stockColor = isLow ? "text-orange-500" : "text-[#007A5E]";
                                    const stockBg = isLow ? "bg-orange-50 border-orange-100" : "bg-[#007A5E]/10 border-[#007A5E]/10";
                                    const nextDiscount = getNextFefoDiscountInfo(product.id);

                                    return (
                                        <button
                                            key={product.id}
                                            type="button"
                                            onClick={() => onPickProduct(product.id)}
                                            className="group flex w-full items-center gap-3 rounded-2xl border border-transparent p-3 text-left transition-all hover:border-[#007A5E]/20 hover:bg-[#007A5E]/5"
                                        >
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-black text-[#0F172A] transition-colors group-hover:text-[#007A5E]">
                                                    {product.name}
                                                </p>
                                                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[#0F172A]/40">
                                                    {product.category || "General"}
                                                    <span className="mx-1">•</span>
                                                    Rs {(product.sellingPrice ?? 0).toFixed(2)}
                                                    {nextDiscount ? <span className="ml-1 text-[#007A5E]">next FEFO batch {nextDiscount.rate}% off</span> : null}
                                                </p>
                                                {nextDiscount ? (
                                                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest text-[#007A5E]">
                                                        {nextDiscount.quantity} units sell at the discounted price from {nextDiscount.batchLabel}
                                                    </p>
                                                ) : null}
                                            </div>
                                            <div className={`flex-shrink-0 rounded-xl border px-3 py-1.5 text-center ${stockBg}`}>
                                                <p className={`text-base font-black leading-tight ${stockColor}`}>{stock}</p>
                                                <p className={`text-[9px] font-black uppercase tracking-widest opacity-70 ${stockColor}`}>in stock</p>
                                            </div>
                                        </button>
                                    );
                                })}
                                {!showingAll && hiddenCount > 0 ? (
                                    <div className="flex items-center gap-2 px-3 py-2">
                                        <Search size={12} className="flex-shrink-0 text-[#0F172A]/30" />
                                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#0F172A]/40">
                                            Showing 5 of {availableProducts.length} — search to find more
                                        </p>
                                    </div>
                                ) : null}
                            </>
                        );
                    })()}
                </div>
            </DialogContent>
        </Dialog>
    );
}
