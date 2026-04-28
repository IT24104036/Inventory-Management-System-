package invigo.invigo.service;

import invigo.invigo.entity.Batch;
import invigo.invigo.entity.DiscountSuggestion;
import invigo.invigo.repository.BatchRepository;
import invigo.invigo.repository.DiscountRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class DiscountService {

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_ACTIVE = "ACTIVE";
    private static final String STATUS_INACTIVE = "INACTIVE";
    private static final String STATUS_REJECTED = "REJECTED";

    private final DiscountRepository discountRepository;
    private final BatchRepository batchRepository;

    public DiscountService(DiscountRepository discountRepository, BatchRepository batchRepository) {
        this.discountRepository = discountRepository;
        this.batchRepository = batchRepository;
    }

    public List<DiscountSuggestion> getAllDiscounts() {
        deactivateInvalidDiscounts();
        return discountRepository.findAll();
    }

    /**
     * Auto-generate discount suggestions for batches expiring within 7 days.
     * Skips batches that already have a suggestion.
     * Rate logic:
     *   1–3 days → 30%
     *   4–5 days → 20%
     *   6–7 days → 10%
     */
    public List<DiscountSuggestion> generateSuggestions() {
        deactivateInvalidDiscounts();

        List<DiscountSuggestion> generatedOrRefreshed = new ArrayList<>();
        for (Batch batch : batchRepository.findAll()) {
            Optional<DiscountSuggestion> existingOpt = discountRepository.findByBatch_Id(batch.getId());
            boolean qualifiesForSuggestion = shouldSuggestDiscount(batch);

            if (!qualifiesForSuggestion) {
                if (existingOpt.isPresent()) {
                    DiscountSuggestion existing = existingOpt.get();
                    if (STATUS_PENDING.equals(existing.getStatus())) {
                        existing.setStatus(STATUS_INACTIVE);
                        existing.setReviewRequestedAt(null);
                        existing.setReviewRequestedBy(null);
                        generatedOrRefreshed.add(discountRepository.save(existing));
                    }
                }
                continue;
            }

            double suggestedRate = suggestedRateFor(batch);

            if (existingOpt.isEmpty()) {
                DiscountSuggestion created = new DiscountSuggestion();
                created.setProduct(batch.getProduct());
                created.setBatch(batch);
                created.setSuggestedRate(suggestedRate);
                created.setStatus(STATUS_PENDING);
                generatedOrRefreshed.add(discountRepository.save(created));
                continue;
            }

            DiscountSuggestion existing = existingOpt.get();
            if (syncSuggestionWithLatestMl(existing, suggestedRate)) {
                generatedOrRefreshed.add(discountRepository.save(existing));
            }
        }
        return generatedOrRefreshed;
    }

    public Map<String, Object> getExpiryActionFeed() {
        deactivateInvalidDiscounts();

        LocalDate today = LocalDate.now();
        List<Map<String, Object>> items = batchRepository.findAll().stream()
                .filter(batch -> batch.getQuantity() != null && batch.getQuantity() > 0)
                .map(batch -> toExpiryActionItem(batch, today))
                .filter(item -> item != null)
                .sorted(Comparator
                        .comparingInt((Map<String, Object> item) -> (Integer) item.get("priority"))
                        .thenComparing(DiscountService::impactScoreForSort, Comparator.reverseOrder())
                        .thenComparingInt(item -> (Integer) item.get("daysLeft"))
                        .thenComparing(item -> String.valueOf(item.get("productName"))))
                .toList();

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("count", items.size());
        response.put("items", items);
        return response;
    }

    public DiscountSuggestion updateDiscount(Long id, UpdateDiscountRequest req) {
        deactivateInvalidDiscounts();
        DiscountSuggestion ds = discountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Discount not found: " + id));
        if (req.getFinalRate() != null) {
            if (req.getFinalRate() <= 0 || req.getFinalRate() > 100) {
                throw new IllegalArgumentException("Final rate must be between 1 and 100.");
            }
            ds.setFinalRate(req.getFinalRate());
        }
        if (req.getStatus() != null) {
            if (!isSupportedStatus(req.getStatus())) {
                throw new IllegalArgumentException("Unsupported discount status: " + req.getStatus());
            }
            if (STATUS_ACTIVE.equals(req.getStatus())) {
                if (!isSellable(ds.getBatch())) {
                    throw new IllegalArgumentException("Only in-stock, unexpired batches can have an active discount.");
                }
                if (ds.getFinalRate() == null) {
                    ds.setFinalRate(ds.getSuggestedRate());
                }
            }
            ds.setStatus(req.getStatus());
        }
        return discountRepository.save(ds);
    }

    public DiscountSuggestion requestReview(Long id, RequestReviewRequest req) {
        deactivateInvalidDiscounts();
        DiscountSuggestion ds = discountRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Discount not found: " + id));

        if (!STATUS_PENDING.equals(ds.getStatus())) {
            throw new IllegalArgumentException("Only pending discount suggestions can be sent for review.");
        }
        if (!isSellable(ds.getBatch())) {
            throw new IllegalArgumentException("Only in-stock, unexpired batches can be reviewed for discount action.");
        }

        String requestedBy = req.getRequestedBy() != null ? req.getRequestedBy().trim() : "";
        if (requestedBy.isBlank()) {
            throw new IllegalArgumentException("Requested by is required.");
        }

        if (ds.getReviewRequestedAt() == null) {
            ds.setReviewRequestedAt(LocalDateTime.now());
        }
        ds.setReviewRequestedBy(requestedBy);
        return discountRepository.save(ds);
    }

    public void deleteDiscount(Long id) {
        if (!discountRepository.existsById(id)) {
            throw new IllegalArgumentException("Discount not found: " + id);
        }
        discountRepository.deleteById(id);
    }

    private void deactivateInvalidDiscounts() {
        LocalDate today = LocalDate.now();
        List<DiscountSuggestion> dirty = new ArrayList<>();

        for (DiscountSuggestion suggestion : discountRepository.findAll()) {
            Batch batch = suggestion.getBatch();
            if (batch == null) continue;

            boolean expired = batch.getExpiryDate() != null && batch.getExpiryDate().isBefore(today);
            boolean depleted = batch.getQuantity() == null || batch.getQuantity() <= 0;
            boolean noLongerQualifies = !shouldSuggestDiscount(batch);
            if ((expired || depleted)
                    && (STATUS_ACTIVE.equals(suggestion.getStatus()) || STATUS_PENDING.equals(suggestion.getStatus()))) {
                suggestion.setStatus(STATUS_INACTIVE);
                suggestion.setReviewRequestedAt(null);
                suggestion.setReviewRequestedBy(null);
                dirty.add(suggestion);
            } else if (noLongerQualifies && STATUS_PENDING.equals(suggestion.getStatus())) {
                suggestion.setStatus(STATUS_INACTIVE);
                suggestion.setReviewRequestedAt(null);
                suggestion.setReviewRequestedBy(null);
                dirty.add(suggestion);
            }
        }

        if (!dirty.isEmpty()) {
            discountRepository.saveAll(dirty);
        }
    }

    private Map<String, Object> toExpiryActionItem(Batch batch, LocalDate today) {
        long daysLeft = batch.getExpiryDate() != null
                ? ChronoUnit.DAYS.between(today, batch.getExpiryDate())
                : Integer.MAX_VALUE;
        DiscountSuggestion suggestion = discountRepository.findByBatch_Id(batch.getId()).orElse(null);

        String riskLabel = batch.getLastRiskLabel();
        String actionType;
        String displayRisk;
        int priority;

        if (batch.getExpiryDate() != null && batch.getExpiryDate().isBefore(today)) {
            actionType = "LOG_WASTE";
            displayRisk = "Expired";
            priority = 0;
        } else if (isHighRisk(batch)) {
            actionType = suggestion != null && STATUS_ACTIVE.equals(suggestion.getStatus())
                    ? "DISCOUNT_ACTIVE"
                    : "PENDING_REVIEW";
            displayRisk = "High Risk";
            priority = 1;
        } else if (isWarning(batch)) {
            actionType = suggestion != null && STATUS_ACTIVE.equals(suggestion.getStatus())
                    ? "DISCOUNT_ACTIVE"
                    : "PENDING_REVIEW";
            displayRisk = "Warning";
            priority = 2;
        } else {
            return null;
        }

        Map<String, Object> item = new LinkedHashMap<>();
        item.put("batchId", batch.getId());
        item.put("batchNumber", batch.getBatchNumber());
        item.put("productId", batch.getProduct().getId());
        item.put("productName", batch.getProduct().getName());
        item.put("category", batch.getProduct().getCategory());
        item.put("quantity", batch.getQuantity());
        item.put("expiryDate", batch.getExpiryDate() != null ? batch.getExpiryDate().toString() : null);
        item.put("daysLeft", safeDaysLeft(daysLeft));
        item.put("riskLevel", displayRisk);
        item.put("riskProbability", batch.getLastRiskProbability());
        item.put("impactScore", batch.getImpactScore());
        item.put("actionType", actionType);
        item.put("discountId", suggestion != null ? suggestion.getId() : null);
        item.put("discountStatus", suggestion != null ? suggestion.getStatus() : null);
        item.put("suggestedRate", suggestion != null ? suggestion.getSuggestedRate() : (shouldSuggestDiscount(batch) ? suggestedRateFor(batch) : null));
        item.put("finalRate", suggestion != null ? suggestion.getFinalRate() : null);
        item.put("reviewRequested", suggestion != null && suggestion.getReviewRequestedAt() != null);
        item.put("reviewRequestedAt", suggestion != null && suggestion.getReviewRequestedAt() != null
                ? suggestion.getReviewRequestedAt().toString()
                : null);
        item.put("reviewRequestedBy", suggestion != null ? suggestion.getReviewRequestedBy() : null);
        item.put("priority", priority);
        return item;
    }

    private boolean shouldSuggestDiscount(Batch batch) {
        return isSellable(batch) && suggestedRateFor(batch) > 0;
    }

    private boolean syncSuggestionWithLatestMl(DiscountSuggestion suggestion, double suggestedRate) {
        boolean changed = false;

        if (suggestion.getSuggestedRate() == null || Math.abs(suggestion.getSuggestedRate() - suggestedRate) > 0.0001) {
            suggestion.setSuggestedRate(suggestedRate);
            changed = true;
        }

        String status = suggestion.getStatus();
        if (STATUS_INACTIVE.equals(status)) {
            suggestion.setStatus(STATUS_PENDING);
            suggestion.setFinalRate(null);
            suggestion.setReviewRequestedAt(null);
            suggestion.setReviewRequestedBy(null);
            changed = true;
            status = STATUS_PENDING;
        }

        if (STATUS_REJECTED.equals(status) || STATUS_ACTIVE.equals(status) || STATUS_PENDING.equals(status)) {
            return changed;
        }

        suggestion.setStatus(STATUS_PENDING);
        return true;
    }

    private boolean isSellable(Batch batch) {
        return batch != null
                && batch.getQuantity() != null
                && batch.getQuantity() > 0
                && batch.getExpiryDate() != null
                && !batch.getExpiryDate().isBefore(LocalDate.now());
    }

    private long daysUntilExpiry(Batch batch) {
        if (batch == null || batch.getExpiryDate() == null) return Integer.MAX_VALUE;
        return ChronoUnit.DAYS.between(LocalDate.now(), batch.getExpiryDate());
    }

    private int safeDaysLeft(long daysLeft) {
        return (int) Math.max(Math.min(daysLeft, Integer.MAX_VALUE), Integer.MIN_VALUE);
    }

    private static Double impactScoreForSort(Map<String, Object> item) {
        Object value = item.get("impactScore");
        return value instanceof Number ? ((Number) value).doubleValue() : -1.0;
    }

    /**
     * Improvement #12: Probability-proportional discount rates.
     *
     * Old behaviour: flat 20% for High Risk, 15% for everything else — ignores
     * how HIGH the ML risk probability actually is within the "High Risk" band.
     *
     * New behaviour: the suggested discount scales with the stored ML probability:
     *   prob ≥ 0.90  →  30%  (very high confidence of waste — act urgently)
     *   prob ≥ 0.70  →  20%  (high risk — standard markdown)
     *   prob ≥ 0.50  →  15%  (moderate risk / near-expiry fallback)
     *   otherwise    →  10%  (low risk; minor awareness discount)
     *
     * If the batch has never been ML-scanned (lastRiskProbability == null), we
     * fall back to the old flat tiers so behaviour is unchanged for unscanned batches.
     */
    private double suggestedRateFor(Batch batch) {
        Double prob = batch.getLastRiskProbability();

        if (prob != null) {
            if (prob > 0.70) return 30.0;
            if (prob >= 0.40) return 15.0;
            return 0.0;
        }

        if (isHighRisk(batch)) return 30.0;
        if (isWarning(batch)) return 15.0;
        return 0.0;
    }

    private boolean isHighRisk(Batch batch) {
        if (batch == null) return false;
        if ("High Risk".equals(batch.getLastRiskLabel())) return true;
        Double prob = batch.getLastRiskProbability();
        return prob != null && prob > 0.70;
    }

    private boolean isWarning(Batch batch) {
        if (batch == null) return false;
        if ("Warning".equals(batch.getLastRiskLabel())) return true;
        if (isHighRisk(batch)) return false;
        Double prob = batch.getLastRiskProbability();
        return prob != null && prob >= 0.40;
    }

    private boolean isSupportedStatus(String status) {
        return STATUS_PENDING.equals(status)
                || STATUS_ACTIVE.equals(status)
                || STATUS_REJECTED.equals(status)
                || STATUS_INACTIVE.equals(status);
    }

    // ── Inner DTO ──────────────────────────────────────────────────────────
    public static class UpdateDiscountRequest {
        private Double finalRate;
        private String status;

        public Double getFinalRate() { return finalRate; }
        public void setFinalRate(Double finalRate) { this.finalRate = finalRate; }

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }

    public static class RequestReviewRequest {
        private String requestedBy;

        public String getRequestedBy() { return requestedBy; }
        public void setRequestedBy(String requestedBy) { this.requestedBy = requestedBy; }
    }
}
