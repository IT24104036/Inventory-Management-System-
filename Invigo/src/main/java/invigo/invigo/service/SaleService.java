package invigo.invigo.service;

import invigo.invigo.entity.*;
import invigo.invigo.repository.BatchRepository;
import invigo.invigo.repository.DiscountRepository;
import invigo.invigo.repository.ProductRepository;
import invigo.invigo.repository.SaleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

@Service
public class SaleService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private SaleRepository saleRepository;

    @Autowired
    private DiscountRepository discountRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private AuthorizationService authorizationService;

    @Autowired
    private BatchResolutionService batchResolutionService;

    @Autowired
    private StockAuditService stockAuditService;

    // --- DTOs for service boundary ---

    public static class SaleItemRequest {
        public Long productId;
        public Integer quantity;
    }

    public static class CreateSaleRequest {
        public LocalDate saleDate;
        public String recordedBy;
        public String notes;
        public List<SaleItemRequest> items;
        public String customerName;
        public String customerEmail;
        public String lastEditedBy;
        public String editReason;
        public String clientRequestKey;
        public boolean asDraft = false;
    }

    public static class EditSaleRequest {
        public Integer newQuantity;
        public String editedBy;
        public String editReason;
    }

    public static class VoidSaleRequest {
        public String voidedBy;
        public String voidReason;
    }

    public static class UnvoidSaleRequest {
        public String unvoidedBy;
        public String unvoidReason;
    }

    private static class BatchAllocation {
        private final Batch batch;
        private final int quantity;
        private final Double discountRate;
        private final Double unitPrice;

        private BatchAllocation(Batch batch, int quantity, Double discountRate, Double unitPrice) {
            this.batch = batch;
            this.quantity = quantity;
            this.discountRate = discountRate;
            this.unitPrice = unitPrice;
        }
    }

    private static class BatchSnapshot {
        private final Batch batch;
        private int remainingQuantity;

        private BatchSnapshot(Batch batch) {
            this.batch = batch;
            this.remainingQuantity = batch.getQuantity() != null ? batch.getQuantity() : 0;
        }
    }

    // --- Duplicate risk check ---

    public boolean isDuplicateRisk(Long productId, LocalDate saleDate, Integer quantity, String customerName) {
        authorizationService.requireSalesRecording();
        List<Sale> existing;
        if (customerName == null || customerName.isBlank()) {
            existing = saleRepository.findByProductIdAndSaleDateAndQuantitySoldAndCustomerNameIsNullAndStatus(
                    productId, saleDate, quantity, SaleStatus.ACTIVE);
        } else {
            existing = saleRepository.findByProductIdAndSaleDateAndQuantitySoldAndCustomerNameAndStatus(
                    productId, saleDate, quantity, customerName, SaleStatus.ACTIVE);
        }
        return !existing.isEmpty();
    }

    // --- Create POS sale (supports DRAFT mode) ---

    @Transactional
    public List<Sale> createPosSale(CreateSaleRequest request) {
        authorizationService.requireSalesRecording();
        if (request.saleDate == null) {
            request.saleDate = LocalDate.now();
        }
        String submissionKey = request.clientRequestKey != null ? request.clientRequestKey.trim() : "";
        if (!submissionKey.isBlank()) {
            List<Sale> existingSubmission = saleRepository.findBySubmissionKey(submissionKey);
            if (!existingSubmission.isEmpty()) {
                return existingSubmission;
            }
        }
        if (!request.saleDate.equals(LocalDate.now())) {
            throw new IllegalArgumentException("Sale date must be today's date. Past and future dates are not permitted.");
        }
        if (request.items == null || request.items.isEmpty()) {
            throw new IllegalArgumentException("At least one line item is required");
        }

        String actorUsername = authorizationService.getCurrentUsername();
        SaleStatus lineStatus = request.asDraft ? SaleStatus.DRAFT : SaleStatus.ACTIVE;
        validateRequestItems(request.items);
        validateRequestedStock(request.items);

        Random random = new Random();
        String saleGroupId = String.format("BILL-%04d", random.nextInt(10000));
        List<Sale> created = new ArrayList<>();
        Map<Long, List<BatchSnapshot>> draftSnapshotsByProductId = new HashMap<>();

        for (SaleItemRequest item : request.items) {
            Product product = productRepository.findById(item.productId)
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + item.productId));

            List<BatchAllocation> allocations = request.asDraft
                    ? allocateDraftBatches(product, item.quantity, draftSnapshotsByProductId)
                    : allocateAndDeductLiveBatches(product, item.quantity, "SALE_RECORDED", "Sale recorded", "BILL", saleGroupId, actorUsername);

            for (BatchAllocation allocation : allocations) {
                Sale sale = buildSaleRecord(
                        product,
                        allocation,
                        request.saleDate,
                        actorUsername,
                        lineStatus,
                        saleGroupId,
                        request.notes,
                        request.customerName,
                        request.customerEmail,
                        null,
                        null,
                        null,
                        submissionKey.isBlank() ? null : submissionKey
                );
                created.add(saleRepository.save(sale));
            }
        }

        if (!request.asDraft && request.customerEmail != null && !request.customerEmail.isBlank()) {
            scheduleBillEmailAfterCommit(
                    request.customerEmail,
                    request.customerName != null ? request.customerName : "Valued Customer",
                    saleGroupId,
                    created
            );
        }

        return created;
    }

    // --- Finalize a DRAFT bill ---

    @Transactional
    public List<Sale> finalizeDraft(String billGroupId, String finalizedBy) {
        authorizationService.requireSalesRecording();
        List<Sale> draftLines = saleRepository.findBySaleGroupIdAndStatus(billGroupId, SaleStatus.DRAFT);
        if (draftLines.isEmpty()) {
            throw new IllegalArgumentException("No draft lines found for bill: " + billGroupId);
        }

        validateDraftBatchAvailability(draftLines);

        for (Sale line : draftLines) {
            authorizationService.requireSaleEditAccess(line);
            deductSpecificBatch(line.getBatch(), line.getQuantitySold(), line.getProduct(), "DRAFT_FINALIZED", "Draft bill finalized", "BILL", billGroupId, authorizationService.getCurrentUsername());
            line.setStatus(SaleStatus.ACTIVE);
            line.setLastEditedBy(authorizationService.getCurrentUsername());
            line.setEditedAt(LocalDateTime.now());
            line.setEditReason("Draft finalized");
            saleRepository.save(line);
        }

        String email = draftLines.get(0).getCustomerEmail();
        if (email != null && !email.isBlank()) {
            scheduleBillEmailAfterCommit(
                    email,
                    draftLines.get(0).getCustomerName() != null ? draftLines.get(0).getCustomerName() : "Valued Customer",
                    billGroupId,
                    draftLines
            );
        }

        return draftLines;
    }

    // --- Get all sales ---

    public List<Sale> getAllSales() {
        authorizationService.requireSalesRecording();
        return authorizationService.filterAccessibleSales(saleRepository.findAll());
    }

    // --- Edit single sale quantity ---

    @Transactional
    public Sale editSaleQuantity(Long saleId, EditSaleRequest request) {
        authorizationService.requireSalesRecording();
        if (request.newQuantity == null || request.newQuantity <= 0) {
            throw new IllegalArgumentException("Quantity must be greater than 0");
        }

        Sale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new IllegalArgumentException("Sale not found"));
        authorizationService.requireSaleEditAccess(sale);

        if (sale.getStatus() == SaleStatus.VOID) {
            throw new IllegalStateException("Cannot edit a voided sale");
        }
        if (sale.getStatus() == SaleStatus.DRAFT) {
            throw new IllegalStateException("Finalize the draft bill before editing individual lines");
        }

        int oldQty = sale.getQuantitySold();
        int newQty = request.newQuantity;
        int diff = newQty - oldQty;

        if (diff > 0) {
            deductForExistingSaleLine(sale, diff, "SALE_EDIT_INCREASE", request.editReason, "SALE", String.valueOf(saleId), authorizationService.getCurrentUsername());
        } else if (diff < 0) {
            restoreSaleLineQuantity(sale, Math.abs(diff), "SALE_EDIT_DECREASE", request.editReason, "SALE", String.valueOf(saleId), authorizationService.getCurrentUsername());
        }

        sale.setQuantitySold(newQty);
        sale.setLineTotal(sale.getUnitPrice() * newQty);
        sale.setLastEditedBy(authorizationService.getCurrentUsername());
        sale.setEditedAt(LocalDateTime.now());
        sale.setEditReason(request.editReason);

        return saleRepository.save(sale);
    }

    // --- Void a sale ---

    @Transactional
    public Sale voidSale(Long saleId, VoidSaleRequest request) {
        authorizationService.requireSalesRecording();
        if (request == null || request.voidReason == null || request.voidReason.isBlank()) {
            throw new IllegalArgumentException("Void reason is required");
        }

        Sale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new IllegalArgumentException("Sale not found"));
        authorizationService.requireSaleEditAccess(sale);

        if (sale.getStatus() == SaleStatus.VOID) {
            throw new IllegalStateException("Sale is already voided");
        }

        if (sale.getStatus() == SaleStatus.ACTIVE) {
            restoreSaleLineQuantity(sale, sale.getQuantitySold(), "SALE_VOID", request.voidReason.trim(), "SALE", String.valueOf(saleId), authorizationService.getCurrentUsername());
        }

        sale.setStatus(SaleStatus.VOID);
        sale.setVoidedBy(authorizationService.getCurrentUsername());
        sale.setVoidedAt(LocalDateTime.now());
        sale.setVoidReason(request.voidReason.trim());

        return saleRepository.save(sale);
    }

    // --- Unvoid a sale ---

    @Transactional
    public Sale unvoidSale(Long saleId, UnvoidSaleRequest request) {
        authorizationService.requireSalesRecording();
        if (request == null || request.unvoidReason == null || request.unvoidReason.isBlank()) {
            throw new IllegalArgumentException("Unvoid reason is required");
        }

        Sale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new IllegalArgumentException("Sale not found"));
        authorizationService.requireSaleUnvoidAccess();

        if (sale.getStatus() != SaleStatus.VOID) {
            throw new IllegalStateException("Only voided sales can be unvoided");
        }

        // Re-run FEFO deduction — check stock first
        deductForExistingSaleLine(sale, sale.getQuantitySold(), "SALE_UNVOID", request.unvoidReason.trim(), "SALE", String.valueOf(saleId), authorizationService.getCurrentUsername());

        sale.setStatus(SaleStatus.ACTIVE);
        sale.setUnvoidedBy(authorizationService.getCurrentUsername());
        sale.setUnvoidedAt(LocalDateTime.now());
        sale.setUnvoidReason(request.unvoidReason.trim());

        return saleRepository.save(sale);
    }

    // --- Replace (edit) entire bill ---

    @Transactional
    public List<Sale> replaceBill(String billGroupId, CreateSaleRequest request) {
        // Find all active lines for this bill group
        List<Sale> existing = saleRepository.findBySaleGroupId(billGroupId);
        authorizationService.requireSalesRecording();
        if (existing.isEmpty()) {
            throw new IllegalArgumentException("Bill not found: " + billGroupId);
        }
        authorizationService.requireSaleEditAccess(existing.get(0));
        String currentUsername = authorizationService.getCurrentUsername();
        String internalVoidedBy = currentUsername;
        String internalVoidReason = "Bill replaced" + (request.editReason != null ? " - " + request.editReason : "");
        validateRequestItems(request.items);

        // ── Preserve the original bill's createdAt so the 2-hour edit window
        //    is anchored to first creation, not to later edits. ──────────────
        LocalDateTime originalCreatedAt = existing.stream()
                .filter(s -> s.getCreatedAt() != null)
                .map(Sale::getCreatedAt)
                .findFirst()
                .orElse(LocalDateTime.now());

        // Void each existing active line and restore inventory
        for (Sale s : existing) {
            if (s.getStatus() == SaleStatus.ACTIVE) {
                restoreSaleLineQuantity(s, s.getQuantitySold(), "BILL_REPLACE_VOID", internalVoidReason, "BILL", billGroupId, currentUsername);
                s.setStatus(SaleStatus.VOID);
                s.setVoidedBy(internalVoidedBy);
                s.setVoidedAt(LocalDateTime.now());
                s.setVoidReason(internalVoidReason);
                saleRepository.save(s);
            } else if (s.getStatus() == SaleStatus.DRAFT) {
                // Cancel draft lines without restoring (no stock was deducted)
                s.setStatus(SaleStatus.VOID);
                s.setVoidedBy(internalVoidedBy);
                s.setVoidedAt(LocalDateTime.now());
                s.setVoidReason(internalVoidReason);
                saleRepository.save(s);
            }
        }

        // Preserve original creator from the first active/non-void line (before they were voided)
        final String originalRecordedBy = existing.stream()
                .filter(s -> s.getRecordedBy() != null)
                .map(Sale::getRecordedBy)
                .findFirst()
                .orElse(request.lastEditedBy != null ? request.lastEditedBy : "system");

        // Create new ACTIVE lines with the same billGroupId — always use today's date
        request.saleDate = LocalDate.now();
        validateRequestedStock(request.items);
        List<Sale> created = new ArrayList<>();
        for (SaleItemRequest item : request.items) {
            Product product = productRepository.findById(item.productId)
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + item.productId));
            for (BatchAllocation allocation : allocateAndDeductLiveBatches(product, item.quantity, "BILL_REPLACED", request.editReason, "BILL", billGroupId, currentUsername)) {
                Sale sale = buildSaleRecord(
                        product,
                        allocation,
                        request.saleDate,
                        originalRecordedBy,
                        SaleStatus.ACTIVE,
                        billGroupId,
                        request.notes,
                        request.customerName,
                        request.customerEmail,
                        currentUsername,
                        LocalDateTime.now(),
                        request.editReason,
                        null
                );
                sale.setCreatedAt(originalCreatedAt);
                created.add(saleRepository.save(sale));
            }
            // ── Preserve original createdAt so the 2h edit window doesn't reset ──
        }


        String emailTo = request.customerEmail;
        if (emailTo != null && !emailTo.isBlank()) {
            scheduleBillEmailAfterCommit(
                    emailTo,
                    request.customerName != null ? request.customerName : "Valued Customer",
                    billGroupId,
                    created
            );
        }
        return created;
    }

    private void validateRequestItems(List<SaleItemRequest> items) {
        if (items == null || items.isEmpty()) {
            throw new IllegalArgumentException("At least one line item is required");
        }

        for (SaleItemRequest item : items) {
            if (item.productId == null) {
                throw new IllegalArgumentException("Product ID is required");
            }
            if (item.quantity == null || item.quantity <= 0) {
                throw new IllegalArgumentException("Quantity must be greater than 0");
            }
            if (!productRepository.existsById(item.productId)) {
                throw new IllegalArgumentException("Product not found: " + item.productId);
            }
        }
    }

    private void validateRequestedStock(List<SaleItemRequest> items) {
        Map<Long, Integer> requestedByProductId = new HashMap<>();
        for (SaleItemRequest item : items) {
            requestedByProductId.merge(item.productId, item.quantity, Integer::sum);
        }

        for (Map.Entry<Long, Integer> entry : requestedByProductId.entrySet()) {
            Product product = productRepository.findById(entry.getKey())
                    .orElseThrow(() -> new IllegalArgumentException("Product not found: " + entry.getKey()));
            int available = getAvailableQuantityForProduct(product);
            if (entry.getValue() > available) {
                throw new IllegalStateException("Insufficient stock available for product " + product.getName());
            }
        }
    }

    private List<BatchAllocation> allocateDraftBatches(Product product, int quantity, Map<Long, List<BatchSnapshot>> draftSnapshotsByProductId) {
        List<BatchSnapshot> snapshots = draftSnapshotsByProductId.computeIfAbsent(
                product.getId(),
                ignored -> loadSellableBatches(product).stream().map(BatchSnapshot::new).toList()
        );
        return allocateFromSnapshots(product, quantity, snapshots);
    }

    private List<BatchAllocation> allocateAndDeductLiveBatches(Product product, int quantity, String actionType, String reason, String referenceType, String referenceId, String actor) {
        List<Batch> batches = loadSellableBatches(product);
        int remaining = quantity;
        List<BatchAllocation> allocations = new ArrayList<>();

        for (Batch batch : batches) {
            if (remaining <= 0) break;
            int available = batch.getQuantity() != null ? batch.getQuantity() : 0;
            if (available <= 0) continue;

            int allocatedQty = Math.min(available, remaining);
            double discountRate = getActiveDiscountRateForBatch(batch).orElse(0.0);
            double unitPrice = product.getSellingPrice() * (1.0 - discountRate / 100.0);

            batch.setQuantity(available - allocatedQty);
            batch = batchRepository.save(batch);
            batchResolutionService.refreshBatchStatus(batch);
            stockAuditService.record(batch, -allocatedQty, actionType, reason, referenceType, referenceId, actor);

            allocations.add(new BatchAllocation(batch, allocatedQty, discountRate > 0 ? discountRate : null, unitPrice));
            remaining -= allocatedQty;
        }

        if (remaining > 0) {
            throw new IllegalStateException("Inventory inconsistency: not enough stock to fulfill FEFO deduction.");
        }

        return allocations;
    }

    private List<BatchAllocation> allocateFromSnapshots(Product product, int quantity, List<BatchSnapshot> snapshots) {
        int remaining = quantity;
        List<BatchAllocation> allocations = new ArrayList<>();

        for (BatchSnapshot snapshot : snapshots) {
            if (remaining <= 0) break;
            if (snapshot.remainingQuantity <= 0) continue;

            int allocatedQty = Math.min(snapshot.remainingQuantity, remaining);
            double discountRate = getActiveDiscountRateForBatch(snapshot.batch).orElse(0.0);
            double unitPrice = product.getSellingPrice() * (1.0 - discountRate / 100.0);

            snapshot.remainingQuantity -= allocatedQty;
            allocations.add(new BatchAllocation(snapshot.batch, allocatedQty, discountRate > 0 ? discountRate : null, unitPrice));
            remaining -= allocatedQty;
        }

        if (remaining > 0) {
            throw new IllegalStateException("Insufficient stock available for product " + product.getName());
        }

        return allocations;
    }

    private Sale buildSaleRecord(Product product,
                                 BatchAllocation allocation,
                                 LocalDate saleDate,
                                 String recordedBy,
                                 SaleStatus status,
                                 String saleGroupId,
                                 String notes,
                                 String customerName,
                                 String customerEmail,
                                 String lastEditedBy,
                                 LocalDateTime editedAt,
                                 String editReason,
                                 String submissionKey) {
        Sale sale = new Sale();
        sale.setProduct(product);
        sale.setBatch(allocation.batch);
        sale.setQuantitySold(allocation.quantity);
        sale.setSaleDate(saleDate);
        sale.setRecordedBy(recordedBy);
        sale.setStatus(status);
        sale.setSaleGroupId(saleGroupId);
        sale.setNotes(notes);
        sale.setCustomerName(customerName);
        sale.setCustomerEmail(customerEmail);
        sale.setUnitPrice(allocation.unitPrice);
        sale.setDiscountRate(allocation.discountRate);
        sale.setLastEditedBy(lastEditedBy);
        sale.setEditedAt(editedAt);
        sale.setEditReason(editReason);
        sale.setSubmissionKey(submissionKey);
        return sale;
    }

    private void scheduleBillEmailAfterCommit(String email, String customerName, String billGroupId, List<Sale> sales) {
        if (email == null || email.isBlank() || sales == null || sales.isEmpty()) {
            return;
        }

        List<Sale> emailLines = new ArrayList<>(sales);
        double total = emailLines.stream().mapToDouble(Sale::getLineTotal).sum();
        Runnable sendTask = () -> {
            try {
                emailService.sendBillEmail(email, customerName, billGroupId, emailLines, total);
            } catch (Exception ignored) {
            }
        };

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    sendTask.run();
                }
            });
        } else {
            sendTask.run();
        }
    }

    private void validateDraftBatchAvailability(List<Sale> draftLines) {
        Map<Long, Integer> requiredByBatchId = new HashMap<>();
        for (Sale line : draftLines) {
            if (line.getBatch() == null || line.getBatch().getId() == null) {
                throw new IllegalStateException("Draft line is missing its reserved batch.");
            }
            requiredByBatchId.merge(line.getBatch().getId(), line.getQuantitySold(), Integer::sum);
        }

        for (Map.Entry<Long, Integer> entry : requiredByBatchId.entrySet()) {
            Batch batch = batchRepository.findById(entry.getKey())
                    .orElseThrow(() -> new IllegalStateException("Batch no longer exists: " + entry.getKey()));
            if ((batch.getQuantity() != null ? batch.getQuantity() : 0) < entry.getValue()) {
                throw new IllegalStateException("Insufficient stock to finalize draft for batch " +
                        (batch.getBatchNumber() != null ? batch.getBatchNumber() : batch.getId()) + ".");
            }
        }
    }

    private void deductForExistingSaleLine(Sale sale, int quantity, String actionType, String reason, String referenceType, String referenceId, String actor) {
        if (sale.getBatch() != null && sale.getBatch().getId() != null) {
            deductSpecificBatch(sale.getBatch(), quantity, sale.getProduct(), actionType, reason, referenceType, referenceId, actor);
            return;
        }

        int available = getAvailableQuantityForProduct(sale.getProduct());
        if (quantity > available) {
            throw new IllegalStateException(
                    "Insufficient stock available to increase sale quantity."
            );
        }
        deductFromBatchesFefo(sale.getProduct(), quantity, actionType, reason, referenceType, referenceId, actor);
    }

    private void deductSpecificBatch(Batch batchRef, int quantity, Product fallbackProduct, String actionType, String reason, String referenceType, String referenceId, String actor) {
        if (batchRef == null || batchRef.getId() == null) {
            deductFromBatchesFefo(fallbackProduct, quantity, actionType, reason, referenceType, referenceId, actor);
            return;
        }

        Batch batch = batchRepository.findById(batchRef.getId())
                .orElseThrow(() -> new IllegalStateException("Batch not found: " + batchRef.getId()));
        int available = batch.getQuantity() != null ? batch.getQuantity() : 0;
        if (available < quantity) {
            throw new IllegalStateException("Insufficient stock in batch " +
                    (batch.getBatchNumber() != null ? batch.getBatchNumber() : batch.getId()) + ".");
        }
        batch.setQuantity(available - quantity);
        batch = batchRepository.save(batch);
        batchResolutionService.refreshBatchStatus(batch);
        stockAuditService.record(batch, -quantity, actionType, reason, referenceType, referenceId, actor);
    }

    private void restoreSaleLineQuantity(Sale sale, int quantity, String actionType, String reason, String referenceType, String referenceId, String actor) {
        if (sale.getBatch() != null && sale.getBatch().getId() != null) {
            Batch batch = batchRepository.findById(sale.getBatch().getId())
                    .orElseGet(() -> {
                        Batch recreated = new Batch(sale.getProduct(), 0, LocalDate.now().plusYears(1));
                        recreated.setBatchNumber(sale.getBatch().getBatchNumber());
                        return batchRepository.save(recreated);
                    });
            batch.setQuantity((batch.getQuantity() != null ? batch.getQuantity() : 0) + quantity);
            batch = batchRepository.save(batch);
            batchResolutionService.refreshBatchStatus(batch);
            stockAuditService.record(batch, quantity, actionType, reason, referenceType, referenceId, actor);
            return;
        }

        restoreToLatestBatch(sale.getProduct(), quantity, actionType, reason, referenceType, referenceId, actor);
    }

    private List<Batch> loadSellableBatches(Product product) {
        return batchRepository.findByProductAndExpiryDateGreaterThanEqualOrderByExpiryDateAsc(product, LocalDate.now())
                .stream()
                .filter(batch -> batch.getQuantity() != null && batch.getQuantity() > 0)
                .toList();
    }

    private Optional<Double> getActiveDiscountRateForBatch(Batch batch) {
        return discountRepository.findByBatch_IdAndStatus(batch.getId(), "ACTIVE")
                .map(discount -> discount.getFinalRate() != null ? discount.getFinalRate() : discount.getSuggestedRate());
    }

    // --- FEFO / Inventory helpers ---

    private int getAvailableQuantityForProduct(Product product) {
        return batchRepository
                .findByProductAndExpiryDateGreaterThanEqualOrderByExpiryDateAsc(product, LocalDate.now())
                .stream()
                .mapToInt(Batch::getQuantity)
                .sum();
    }

    private void deductFromBatchesFefo(Product product, int quantity, String actionType, String reason, String referenceType, String referenceId, String actor) {
        List<Batch> batches = batchRepository
                .findByProductAndExpiryDateGreaterThanEqualOrderByExpiryDateAsc(product, LocalDate.now());

        int remaining = quantity;
        for (Batch batch : batches) {
            if (remaining <= 0) break;

            int available = batch.getQuantity();
            int deducted;
            if (available >= remaining) {
                deducted = remaining;
                batch.setQuantity(available - remaining);
                remaining = 0;
            } else {
                deducted = available;
                remaining -= available;
                batch.setQuantity(0);
            }
            batch = batchRepository.save(batch);
            batchResolutionService.refreshBatchStatus(batch);
            stockAuditService.record(batch, -deducted, actionType, reason, referenceType, referenceId, actor);
        }

        if (remaining > 0) {
            throw new IllegalStateException("Inventory inconsistency: not enough stock to fulfill FEFO deduction.");
        }
    }

    private void restoreToLatestBatch(Product product, int quantity, String actionType, String reason, String referenceType, String referenceId, String actor) {
        List<Batch> batchesDesc = batchRepository.findByProductOrderByExpiryDateDesc(product);
        if (!batchesDesc.isEmpty()) {
            Batch target = batchesDesc.get(0);
            target.setQuantity(target.getQuantity() + quantity);
            target = batchRepository.save(target);
            batchResolutionService.refreshBatchStatus(target);
            stockAuditService.record(target, quantity, actionType, reason, referenceType, referenceId, actor);
        } else {
            Batch recovery = new Batch(product, quantity, LocalDate.now().plusYears(1));
            recovery = batchRepository.save(recovery);
            batchResolutionService.refreshBatchStatus(recovery);
            stockAuditService.record(recovery, quantity, actionType, reason, referenceType, referenceId, actor);
        }
    }
}
