package invigo.invigo.service;

import invigo.invigo.entity.Batch;
import invigo.invigo.entity.Product;
import invigo.invigo.entity.WasteRecord;
import invigo.invigo.repository.BatchRepository;
import invigo.invigo.repository.BatchRiskPredictionRepository;
import invigo.invigo.repository.DiscountRepository;
import invigo.invigo.repository.ProductRepository;
import invigo.invigo.repository.SaleRepository;
import invigo.invigo.repository.StockAuditEntryRepository;
import invigo.invigo.repository.WasteRecordRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class BatchService {

    /** Allowed reason codes for waste logging (stored uppercase). */
    public static final Set<String> WASTE_REASON_CODES = Set.of(
            "SPOILAGE", "DAMAGE", "RECALL", "EXPIRED_DISPOSAL", "OTHER"
    );

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private WasteRecordRepository wasteRecordRepository;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private DiscountRepository discountRepository;

    @Autowired
    private BatchRiskPredictionRepository batchRiskPredictionRepository;

    @Autowired
    private StockAuditEntryRepository stockAuditEntryRepository;

    @Autowired
    private BatchResolutionService batchResolutionService;

    @Autowired
    private StockAuditService stockAuditService;

    @Autowired
    private AuthorizationService authorizationService;

    // ── DTOs ───────────────────────────────────────────────────────────────

    public static class BatchRequest {
        public Long productId;
        public Integer quantity;
        public String expiryDate;   // ISO-8601 string (yyyy-MM-dd)
        public String batchNumber;
        public String addedDate;    // ISO-8601 string (yyyy-MM-dd), optional
    }

    public static class UpdateBatchRequest {
        public Integer quantity;
        public String expiryDate;   // ISO-8601 string (yyyy-MM-dd)
    }

    public static class RecordWasteRequest {
        public Integer quantity;
        public String notes;
        /** One of SPOILAGE, DAMAGE, RECALL, EXPIRED_DISPOSAL, OTHER — optional, defaults to OTHER. */
        public String reasonCode;
    }

    // ── Read ───────────────────────────────────────────────────────────────

    public List<Batch> getAllBatches() {
        return batchRepository.findAll();
    }

    public List<Map<String, Object>> getStockAuditHistory() {
        return stockAuditService.getHistory();
    }

    // ── Create ─────────────────────────────────────────────────────────────

    public Batch addBatch(BatchRequest request) {
        if (request.productId == null) {
            throw new IllegalArgumentException("Product ID is required.");
        }
        Product product = productRepository.findById(request.productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found."));

        if (request.quantity == null || request.quantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than zero.");
        }
        if (request.expiryDate == null || request.expiryDate.isBlank()) {
            throw new IllegalArgumentException("Expiry date is required.");
        }

        LocalDate expiry = LocalDate.parse(request.expiryDate);

        // Improvement #10: Reject batches whose expiry date is already in the past.
        // Before this check, staff could add a batch with yesterday's date
        // and it would immediately appear as an expired batch with stock.
        if (expiry.isBefore(LocalDate.now())) {
            throw new IllegalArgumentException(
                "Expiry date cannot be in the past. Received: " + expiry);
        }

        LocalDate added = (request.addedDate != null && !request.addedDate.isBlank())
                ? LocalDate.parse(request.addedDate)
                : LocalDate.now();


        Batch batch = new Batch(product, request.quantity, expiry);
        batch.setAddedDate(added);

        if (request.batchNumber != null && !request.batchNumber.isBlank()) {
            batch.setBatchNumber(request.batchNumber.trim());
        } else {
            // Auto-generate: BATCH-<productId>-<epoch>
            batch.setBatchNumber("BATCH-" + product.getId() + "-" + System.currentTimeMillis() % 100000);
        }

        Batch saved = batchRepository.save(batch);
        saved = batchResolutionService.refreshBatchStatus(saved);
        stockAuditService.record(
                saved,
                saved.getQuantity() != null ? saved.getQuantity() : 0,
                "BATCH_CREATED",
                "Batch created",
                "BATCH",
                saved.getId() != null ? String.valueOf(saved.getId()) : null,
                resolveActor()
        );
        return saved;
    }

    // ── Update ─────────────────────────────────────────────────────────────

    public Optional<Batch> updateBatch(Long id, UpdateBatchRequest request) {
        return batchRepository.findById(id).map(batch -> {
            int oldQuantity = batch.getQuantity() != null ? batch.getQuantity() : 0;
            if (request.quantity != null) {
                if (request.quantity < 0) {
                    throw new IllegalArgumentException("Quantity cannot be negative.");
                }
                batch.setQuantity(request.quantity);
            }
            if (request.expiryDate != null && !request.expiryDate.isBlank()) {
                batch.setExpiryDate(LocalDate.parse(request.expiryDate));
            }
            Batch saved = batchRepository.save(batch);
            saved = batchResolutionService.refreshBatchStatus(saved);
            int newQuantity = saved.getQuantity() != null ? saved.getQuantity() : 0;
            int delta = newQuantity - oldQuantity;
            if (delta != 0) {
                stockAuditService.record(
                        saved,
                        delta,
                        "BATCH_ADJUSTED",
                        "Batch quantity adjusted",
                        "BATCH",
                        saved.getId() != null ? String.valueOf(saved.getId()) : null,
                        resolveActor()
                );
            }
            return saved;
        });
    }

    /**
     * Log waste for an expired batch: persists a {@link WasteRecord} and reduces batch quantity.
     */
    @Transactional
    public Map<String, Object> recordWaste(Long batchId, RecordWasteRequest request) {
        if (request == null || request.quantity == null) {
            throw new IllegalArgumentException("Waste quantity is required.");
        }
        int qty = request.quantity;
        if (qty < 1) {
            throw new IllegalArgumentException("Waste quantity must be at least 1.");
        }

        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new IllegalArgumentException("Batch not found."));

        LocalDate today = LocalDate.now();
        // Expired ON the expiry date — if today >= expiryDate the batch is expired.
        if (batch.getExpiryDate().isAfter(today)) {
            throw new IllegalArgumentException("Waste can only be recorded on or after the batch expiry date.");
        }

        int current = batch.getQuantity() != null ? batch.getQuantity() : 0;
        if (current < 1) {
            throw new IllegalArgumentException("This batch has no stock left to waste.");
        }
        if (qty > current) {
            throw new IllegalArgumentException("Waste quantity cannot exceed current stock (" + current + " units).");
        }

        String notes = request.notes != null ? request.notes.trim() : "";
        if (notes.length() > 500) {
            throw new IllegalArgumentException("Notes must be at most 500 characters.");
        }
        if (notes.isEmpty()) {
            notes = null;
        }

        String reason = normalizeWasteReasonCode(request.reasonCode);

        batch.setQuantity(current - qty);
        batchRepository.save(batch);

        WasteRecord record = new WasteRecord(
                batch,
                qty,
                notes,
                LocalDateTime.now(),
                reason
        );
        wasteRecordRepository.save(record);
        batch = batchResolutionService.refreshBatchStatus(batch);
        stockAuditService.record(
                batch,
                -qty,
                "WASTE_RECORDED",
                reason + (notes != null ? " - " + notes : ""),
                "WASTE",
                record.getId() != null ? String.valueOf(record.getId()) : null,
                resolveActor()
        );

        Map<String, Object> wasteSummary = new LinkedHashMap<>();
        wasteSummary.put("id", record.getId());
        wasteSummary.put("quantityWasted", record.getQuantityWasted());
        wasteSummary.put("notes", record.getNotes());
        wasteSummary.put("reasonCode", record.getReasonCode());
        wasteSummary.put("recordedAt", record.getRecordedAt().toString());

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("batch", batch);
        body.put("waste", wasteSummary);
        return body;
    }

    // ── Waste history ───────────────────────────────────────────────────────

    /**
     * Lists waste records with optional filters. Date range is inclusive of calendar days (from/to).
     * When {@code from}/{@code to} are omitted, all records are loaded then filtered in memory
     * (suitable for moderate table sizes).
     */
    public List<Map<String, Object>> getWasteHistory(
            String from,
            String to,
            Long batchId,
            Long productId,
            String category,
            String reasonCode) {

        List<WasteRecord> records;

        if (from != null && to != null && !from.isBlank() && !to.isBlank()) {
            LocalDateTime fromDt = LocalDate.parse(from).atStartOfDay();
            LocalDateTime toDt   = LocalDate.parse(to).plusDays(1).atStartOfDay().minusSeconds(1);
            records = wasteRecordRepository.findByDateRange(fromDt, toDt);
        } else {
            records = wasteRecordRepository.findAllWithBatchAndProduct();
        }

        String catNorm = category != null ? category.trim() : "";
        String reasonNorm = reasonCode != null && !reasonCode.isBlank()
                ? reasonCode.trim().toUpperCase(Locale.ROOT)
                : null;

        records = records.stream()
                .filter(w -> batchId == null || w.getBatch().getId().equals(batchId))
                .filter(w -> productId == null || w.getBatch().getProduct().getId().equals(productId))
                .filter(w -> catNorm.isEmpty()
                        || Objects.equals(
                        w.getBatch().getProduct().getCategory() != null
                                ? w.getBatch().getProduct().getCategory()
                                : "",
                        catNorm))
                .filter(w -> reasonNorm == null
                        || reasonNorm.equals(
                        w.getReasonCode() != null ? w.getReasonCode().toUpperCase(Locale.ROOT) : "OTHER"))
                .collect(Collectors.toList());

        List<Map<String, Object>> result = new java.util.ArrayList<>();
        for (WasteRecord w : records) {
            Batch b = w.getBatch();
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id",             w.getId());
            row.put("recordedAt",     w.getRecordedAt().toString());
            row.put("quantityWasted", w.getQuantityWasted());
            row.put("notes",          w.getNotes());
            row.put("reasonCode",     w.getReasonCode());
            row.put("productId",      b.getProduct().getId());
            row.put("batchId",        b.getId());
            row.put("batchNumber",    b.getBatchNumber());
            row.put("expiryDate",     b.getExpiryDate().toString());
            row.put("productName",    b.getProduct().getName());
            row.put("productCategory",b.getProduct().getCategory());
            double costLoss = w.getQuantityWasted()
                    * (b.getProduct().getCostPrice() != null ? b.getProduct().getCostPrice() : 0.0);
            row.put("costLoss", Math.round(costLoss * 100.0) / 100.0);
            result.add(row);
        }
        return result;
    }

    /** Batch IDs that have at least one waste record (for UI badges). */
    public List<Long> getBatchIdsWithWasteHistory() {
        return wasteRecordRepository.findDistinctBatchIdsWithWaste();
    }

    /**
     * Aggregated waste cost for the last 7 days vs the previous 7 days.
     */
    public Map<String, Object> getWasteWeeklySummary() {
        LocalDate today = LocalDate.now();
        LocalDate currentWindowStart = today.minusDays(6);
        LocalDate previousWindowStart = currentWindowStart.minusDays(7);
        LocalDate previousWindowEnd = currentWindowStart.minusDays(1);

        LocalDateTime fromCurrent = currentWindowStart.atStartOfDay();
        LocalDateTime toCurrent = today.plusDays(1).atStartOfDay().minusNanos(1);
        List<WasteRecord> currentWeek = wasteRecordRepository.findByDateRange(fromCurrent, toCurrent);

        LocalDateTime fromPrevious = previousWindowStart.atStartOfDay();
        LocalDateTime toPrevious = previousWindowEnd.plusDays(1).atStartOfDay().minusNanos(1);
        List<WasteRecord> previousWeek = wasteRecordRepository.findByDateRange(fromPrevious, toPrevious);

        Map<String, Object> out = buildWasteComparisonSummary(
                currentWeek,
                previousWeek,
                "currentWeekCost",
                "previousWeekCost",
                "currentWeekUnits",
                "previousWeekUnits"
        );
        out.put("windowDays", 7);
        out.put("windowStart", currentWindowStart.toString());
        out.put("windowEnd", today.toString());
        out.put("previousWindowStart", previousWindowStart.toString());
        out.put("previousWindowEnd", previousWindowEnd.toString());
        return out;
    }

    /**
     * Aggregated waste cost for the current calendar month vs the previous month.
     */
    public Map<String, Object> getWasteMonthlySummary() {
        LocalDate today = LocalDate.now();
        LocalDate firstThisMonth = today.withDayOfMonth(1);
        LocalDate firstNextMonth = firstThisMonth.plusMonths(1);

        LocalDateTime fromThis = firstThisMonth.atStartOfDay();
        LocalDateTime toThis   = firstNextMonth.atStartOfDay().minusNanos(1);
        List<WasteRecord> thisMonth = wasteRecordRepository.findByDateRange(fromThis, toThis);

        LocalDate firstPrevMonth = firstThisMonth.minusMonths(1);
        LocalDateTime fromPrev = firstPrevMonth.atStartOfDay();
        LocalDateTime toPrev   = firstThisMonth.atStartOfDay().minusNanos(1);
        List<WasteRecord> prevMonth = wasteRecordRepository.findByDateRange(fromPrev, toPrev);

        Map<String, Object> out = buildWasteComparisonSummary(
                thisMonth,
                prevMonth,
                "currentMonthCost",
                "previousMonthCost",
                "currentMonthUnits",
                "previousMonthUnits"
        );
        out.put("year", today.getYear());
        out.put("month", today.getMonthValue());
        return out;
    }

    private Map<String, Object> buildWasteComparisonSummary(
            List<WasteRecord> currentPeriod,
            List<WasteRecord> previousPeriod,
            String currentCostKey,
            String previousCostKey,
            String currentUnitsKey,
            String previousUnitsKey) {
        double costThis = sumWasteCost(currentPeriod);
        double costPrev = sumWasteCost(previousPeriod);
        int unitsThis = currentPeriod.stream().mapToInt(WasteRecord::getQuantityWasted).sum();
        int unitsPrev = previousPeriod.stream().mapToInt(WasteRecord::getQuantityWasted).sum();

        double pctChange;
        if (costPrev <= 0.0001) {
            pctChange = costThis > 0 ? 100.0 : 0.0;
        } else {
            pctChange = ((costThis - costPrev) / costPrev) * 100.0;
        }

        double preventedPct;
        if (costPrev <= 0.0001) {
            preventedPct = 0.0;
        } else {
            preventedPct = Math.max(0.0, ((costPrev - costThis) / costPrev) * 100.0);
        }

        double costSaved = Math.max(costPrev - costThis, 0.0);
        double extraCost = Math.max(costThis - costPrev, 0.0);
        int preventedUnits = Math.max(unitsPrev - unitsThis, 0);
        int extraUnits = Math.max(unitsThis - unitsPrev, 0);
        boolean hasComparisonBaseline = costPrev > 0.0001 || unitsPrev > 0;

        String preventionTrend;
        if (!hasComparisonBaseline && costThis <= 0.0001 && unitsThis == 0) {
            preventionTrend = "NO_DATA";
        } else if (!hasComparisonBaseline) {
            preventionTrend = "NO_BASELINE";
        } else if (costSaved > 0.0001 || preventedUnits > 0) {
            preventionTrend = "IMPROVED";
        } else if (extraCost > 0.0001 || extraUnits > 0) {
            preventionTrend = "WORSE";
        } else {
            preventionTrend = "FLAT";
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put(currentCostKey, Math.round(costThis * 100.0) / 100.0);
        out.put(previousCostKey, Math.round(costPrev * 100.0) / 100.0);
        out.put(currentUnitsKey, unitsThis);
        out.put(previousUnitsKey, unitsPrev);
        out.put("percentChangeVsPrevious", Math.round(pctChange * 10.0) / 10.0);
        out.put("preventedPercentVsPrevious", Math.round(preventedPct * 10.0) / 10.0);
        out.put("costSavedVsPrevious", Math.round(costSaved * 100.0) / 100.0);
        out.put("extraCostVsPrevious", Math.round(extraCost * 100.0) / 100.0);
        out.put("preventedUnitsVsPrevious", preventedUnits);
        out.put("extraUnitsVsPrevious", extraUnits);
        out.put("hasComparisonBaseline", hasComparisonBaseline);
        out.put("preventionTrend", preventionTrend);
        return out;
    }

    private static double sumWasteCost(List<WasteRecord> list) {
        double s = 0.0;
        for (WasteRecord w : list) {
            Batch b = w.getBatch();
            double cp = b.getProduct().getCostPrice() != null ? b.getProduct().getCostPrice() : 0.0;
            s += w.getQuantityWasted() * cp;
        }
        return s;
    }

    private static String normalizeWasteReasonCode(String raw) {
        if (raw == null || raw.isBlank()) {
            return "OTHER";
        }
        String u = raw.trim().toUpperCase(Locale.ROOT);
        if (!WASTE_REASON_CODES.contains(u)) {
            throw new IllegalArgumentException(
                    "reasonCode must be one of: " + String.join(", ", WASTE_REASON_CODES));
        }
        return u;
    }

    // ── Delete ─────────────────────────────────────────────────────────────

    @Transactional
    public boolean deleteBatch(Long id) {
        Optional<Batch> existing = batchRepository.findById(id);
        if (existing.isPresent()) {
            Batch batch = existing.get();
            int currentQuantity = batch.getQuantity() != null ? batch.getQuantity() : 0;
            stockAuditService.record(
                    batch,
                    -currentQuantity,
                    "BATCH_DELETED",
                    "Batch deleted",
                    "BATCH",
                    String.valueOf(id),
                    resolveActor()
            );
            discountRepository.deleteByBatchId(id);
            batchRiskPredictionRepository.deleteByBatchId(id);
            wasteRecordRepository.deleteByBatchId(id);
            saleRepository.clearBatchReference(id);
            stockAuditEntryRepository.clearBatchReference(id);
            batchRepository.delete(batch);
            return true;
        }
        return false;
    }

    private String resolveActor() {
        try {
            return authorizationService.getCurrentActorLabel();
        } catch (Exception ignored) {
            return "system";
        }
    }
}
