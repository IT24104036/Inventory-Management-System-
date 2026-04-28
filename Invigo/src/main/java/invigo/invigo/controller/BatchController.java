package invigo.invigo.controller;

import invigo.invigo.entity.Batch;
import invigo.invigo.service.AuthorizationService;
import invigo.invigo.service.BatchService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/inventory")
@CrossOrigin(origins = "*")
public class BatchController {

    @Autowired
    private BatchService batchService;

    @Autowired
    private AuthorizationService authorizationService;

    /** GET /api/inventory/batches — return all stock batches */
    @GetMapping("/batches")
    public ResponseEntity<List<Batch>> getAllBatches() {
        return ResponseEntity.ok(batchService.getAllBatches());
    }

    /** POST /api/inventory/batches — add a new stock batch */
    @PostMapping("/batches")
    public ResponseEntity<?> addBatch(@RequestBody BatchService.BatchRequest request) {
        authorizationService.requireInventoryManagement();
        try {
            Batch created = batchService.addBatch(request);
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** PUT /api/inventory/batches/{id} — update quantity and/or expiry date */
    @PutMapping("/batches/{id}")
    public ResponseEntity<?> updateBatch(
            @PathVariable Long id,
            @RequestBody BatchService.UpdateBatchRequest request) {
        authorizationService.requireInventoryManagement();
        try {
            return batchService.updateBatch(id, request)
                    .map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /** DELETE /api/inventory/batches/{id} — remove a batch */
    @DeleteMapping("/batches/{id}")
    public ResponseEntity<?> deleteBatch(@PathVariable Long id) {
        authorizationService.requireInventoryManagement();
        if (batchService.deleteBatch(id)) {
            return ResponseEntity.ok().build();
        }
        return ResponseEntity.notFound().build();
    }

    /** POST /api/inventory/batches/{id}/waste — log waste for an expired batch and reduce stock */
    @PostMapping("/batches/{id}/waste")
    public ResponseEntity<?> recordWaste(
            @PathVariable Long id,
            @RequestBody BatchService.RecordWasteRequest request) {
        try {
            return ResponseEntity.ok(batchService.recordWaste(id, request));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * GET /api/inventory/waste — waste history with optional filters.
     * Query: from, to (YYYY-MM-DD), batchId, productId, category, reasonCode (SPOILAGE, DAMAGE, …)
     */
    @GetMapping("/waste")
    public ResponseEntity<List<Map<String, Object>>> getWasteHistory(
            @RequestParam(required = false) String from,
            @RequestParam(required = false) String to,
            @RequestParam(required = false) Long batchId,
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String reasonCode) {
        return ResponseEntity.ok(batchService.getWasteHistory(from, to, batchId, productId, category, reasonCode));
    }

    /** GET /api/inventory/waste/logged-batch-ids — batch IDs that have any waste record */
    @GetMapping("/waste/logged-batch-ids")
    public ResponseEntity<List<Long>> getLoggedBatchIds() {
        return ResponseEntity.ok(batchService.getBatchIdsWithWasteHistory());
    }

    /** GET /api/inventory/waste/monthly-summary — current vs previous month waste cost & units */
    /** GET /api/inventory/waste/weekly-summary - last 7 days vs previous 7 days waste cost & units */
    @GetMapping("/waste/weekly-summary")
    public ResponseEntity<Map<String, Object>> getWasteWeeklySummary() {
        return ResponseEntity.ok(batchService.getWasteWeeklySummary());
    }

    /** GET /api/inventory/stock-audit — latest stock movement audit trail */
    @GetMapping("/stock-audit")
    public ResponseEntity<List<Map<String, Object>>> getStockAuditHistory() {
        authorizationService.requireInventoryManagement();
        return ResponseEntity.ok(batchService.getStockAuditHistory());
    }
}
