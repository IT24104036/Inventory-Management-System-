package invigo.invigo.controller;

import invigo.invigo.dto.ExpiryRiskRequest;
import invigo.invigo.dto.ExpiryRiskResponse;
import invigo.invigo.service.ExpiryRiskService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/ai")
@CrossOrigin(origins = "*")
public class ExpiryRiskController {

    private final ExpiryRiskService expiryRiskService;

    public ExpiryRiskController(ExpiryRiskService expiryRiskService) {
        this.expiryRiskService = expiryRiskService;
    }

    /** POST /api/ai/predict — manual feature-based prediction */
    @PostMapping("/predict")
    public ExpiryRiskResponse predict(@RequestBody ExpiryRiskRequest request) {
        return expiryRiskService.predictRisk(request);
    }

    /** POST /api/ai/predict-from-batch/{batchId} — auto-derivation from DB */
    @PostMapping("/predict-from-batch/{batchId}")
    public ExpiryRiskResponse predictFromBatch(@PathVariable Long batchId) {
        return expiryRiskService.predictFromBatch(batchId);
    }

    /** POST /api/ai/predict-all — bulk prediction for all active batches */
    @PostMapping("/predict-all")
    public ResponseEntity<Map<String, Object>> predictAll() {
        try {
            Map<String, Object> result = expiryRiskService.predictAllBatches();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", e.getMessage()));
        }
    }

    /** GET /api/ai/risk-summary — aggregated counts from persisted labels (no ML call) */
    @GetMapping("/risk-summary")
    public ResponseEntity<Map<String, Object>> riskSummary() {
        return ResponseEntity.ok(expiryRiskService.getRiskSummary());
    }

    /** GET /api/ai/validation-summary — compare past predictions against resolved real outcomes */
    @GetMapping("/validation-summary")
    public ResponseEntity<Map<String, Object>> validationSummary() {
        return ResponseEntity.ok(expiryRiskService.getValidationSummary());
    }

    @GetMapping("/validation-trend")
    public ResponseEntity<List<Map<String, Object>>> validationTrend() {
        return ResponseEntity.ok(expiryRiskService.getValidationTrend());
    }
}
