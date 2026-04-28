package invigo.invigo.service;

import invigo.invigo.entity.Batch;
import invigo.invigo.entity.Product;
import invigo.invigo.entity.StockAuditEntry;
import invigo.invigo.repository.StockAuditEntryRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class StockAuditService {

    private final StockAuditEntryRepository stockAuditEntryRepository;

    public StockAuditService(StockAuditEntryRepository stockAuditEntryRepository) {
        this.stockAuditEntryRepository = stockAuditEntryRepository;
    }

    public void record(Batch batch,
                       int quantityDelta,
                       String actionType,
                       String reason,
                       String referenceType,
                       String referenceId,
                       String actor) {
        if (batch == null) {
            return;
        }

        Product product = batch.getProduct();
        StockAuditEntry entry = new StockAuditEntry();
        entry.setBatch(batch);
        entry.setProduct(product);
        entry.setActionType(actionType != null ? actionType : "UNKNOWN");
        entry.setQuantityDelta(quantityDelta);
        entry.setResultingQuantity(batch.getQuantity() != null ? batch.getQuantity() : 0);
        entry.setReason(reason);
        entry.setReferenceType(referenceType);
        entry.setReferenceId(referenceId);
        entry.setActor(actor != null && !actor.isBlank() ? actor : "system");
        entry.setRecordedAt(LocalDateTime.now());
        stockAuditEntryRepository.save(entry);
    }

    public List<Map<String, Object>> getHistory() {
        return stockAuditEntryRepository.findAllWithBatchAndProduct()
                .stream()
                .map(this::toRow)
                .toList();
    }

    private Map<String, Object> toRow(StockAuditEntry entry) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", entry.getId());
        row.put("recordedAt", entry.getRecordedAt() != null ? entry.getRecordedAt().toString() : null);
        row.put("actionType", entry.getActionType());
        row.put("quantityDelta", entry.getQuantityDelta());
        row.put("resultingQuantity", entry.getResultingQuantity());
        row.put("reason", entry.getReason());
        row.put("referenceType", entry.getReferenceType());
        row.put("referenceId", entry.getReferenceId());
        row.put("actor", entry.getActor());
        row.put("batchId", entry.getBatch() != null ? entry.getBatch().getId() : null);
        row.put("batchNumber", entry.getBatch() != null ? entry.getBatch().getBatchNumber() : null);
        row.put("productId", entry.getProduct() != null ? entry.getProduct().getId() : null);
        row.put("productName", entry.getProduct() != null ? entry.getProduct().getName() : null);
        row.put("productCode", entry.getProduct() != null ? entry.getProduct().getCode() : null);
        return row;
    }
}
