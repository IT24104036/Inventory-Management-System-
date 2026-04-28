package invigo.invigo.controller;

import invigo.invigo.entity.DiscountSuggestion;
import invigo.invigo.service.AuthorizationService;
import invigo.invigo.service.DiscountService;
import invigo.invigo.service.ExpiryRiskService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/discounts")
@CrossOrigin(origins = "*")
public class DiscountController {

    @Autowired
    private DiscountService discountService;

    @Autowired
    private ExpiryRiskService expiryRiskService;

    @Autowired
    private AuthorizationService authorizationService;

    /** GET /api/discounts — list all discount suggestions */
    @GetMapping
    public List<DiscountSuggestion> getAll() {
        return discountService.getAllDiscounts();
    }

    /** POST /api/discounts/generate — auto-generate suggestions for near-expiry batches */
    /** POST /api/discounts/generate - run fresh AI predictions and regenerate discount suggestions */
    @PostMapping("/generate")
    public ResponseEntity<?> generate() {
        authorizationService.requireDiscountManagement();
        try {
            Map<String, Object> riskScan = expiryRiskService.predictAllBatches();
            List<DiscountSuggestion> created = discountService.generateSuggestions();
            Map<String, Object> resp = new HashMap<>();
            resp.put("generated", created.size());
            resp.put("suggestions", created);
            resp.put("riskScan", riskScan);
            return ResponseEntity.ok(resp);
        } catch (Exception e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    /** PUT /api/discounts/{id} — admin accepts, overrides rate, or rejects */
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,
                                    @RequestBody DiscountService.UpdateDiscountRequest req) {
        authorizationService.requireDiscountManagement();
        try {
            DiscountSuggestion updated = discountService.updateDiscount(id, req);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    /** POST /api/discounts/{id}/request-review — staff requests manager/admin review */
    @PostMapping("/{id}/request-review")
    public ResponseEntity<?> requestReview(@PathVariable Long id,
                                           @RequestBody DiscountService.RequestReviewRequest req) {
        authorizationService.requireRequestReviewAccess();
        req.setRequestedBy(authorizationService.getCurrentActorLabel());
        try {
            DiscountSuggestion updated = discountService.requestReview(id, req);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }

    /** DELETE /api/discounts/{id} — remove a suggestion */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        authorizationService.requireDiscountManagement();
        try {
            discountService.deleteDiscount(id);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            Map<String, String> err = new HashMap<>();
            err.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(err);
        }
    }
}
