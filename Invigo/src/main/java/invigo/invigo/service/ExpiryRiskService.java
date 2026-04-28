package invigo.invigo.service;

import invigo.invigo.dto.ExpiryRiskRequest;
import invigo.invigo.dto.ExpiryRiskResponse;
import invigo.invigo.entity.Batch;
import invigo.invigo.entity.BatchResolutionStatus;
import invigo.invigo.entity.BatchRiskPrediction;
import invigo.invigo.entity.Product;
import invigo.invigo.entity.Sale;
import invigo.invigo.entity.SaleStatus;
import invigo.invigo.entity.WasteRecord;
import invigo.invigo.repository.BatchRepository;
import invigo.invigo.repository.BatchRiskPredictionRepository;
import invigo.invigo.repository.SaleRepository;
import invigo.invigo.repository.WasteRecordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
public class ExpiryRiskService {

    private static final Logger log = LoggerFactory.getLogger(ExpiryRiskService.class);

    private final RestTemplate restTemplate;

    // ── Improvement #5: URL is no longer hardcoded in Java. ──────────────────
    // It is read from application.properties → ml.api.url
    // To change the ML server address, edit application.properties only.
    @Value("${ml.api.url}")
    private String mlApiBaseUrl;

    @Value("${ml.risk-threshold:0.5}")
    private double riskThreshold;

    @Value("${ml.alert-window-days:7}")
    private int alertWindowDays;

    @Value("${ml.auto-scan.enabled:true}")
    private boolean autoScanEnabled;

    @Value("${ml.auto-scan.fixed-delay-ms:300000}")
    private long autoScanFixedDelayMs;

    private final BatchRepository batchRepository;
    private final SaleRepository  saleRepository;
    private final WasteRecordRepository wasteRecordRepository;
    private final BatchRiskPredictionRepository batchRiskPredictionRepository;
    private final BatchResolutionService batchResolutionService;

    @Autowired
    public ExpiryRiskService(BatchRepository batchRepository,
                             SaleRepository saleRepository,
                             WasteRecordRepository wasteRecordRepository,
                             BatchRiskPredictionRepository batchRiskPredictionRepository,
                             BatchResolutionService batchResolutionService) {
        this(batchRepository, saleRepository, wasteRecordRepository, batchRiskPredictionRepository, batchResolutionService, new RestTemplate());
    }

    public ExpiryRiskService(BatchRepository batchRepository,
                             SaleRepository saleRepository,
                             WasteRecordRepository wasteRecordRepository,
                             BatchRiskPredictionRepository batchRiskPredictionRepository,
                             BatchResolutionService batchResolutionService,
                             RestTemplate restTemplate) {
        this.batchRepository = batchRepository;
        this.saleRepository  = saleRepository;
        this.wasteRecordRepository = wasteRecordRepository;
        this.batchRiskPredictionRepository = batchRiskPredictionRepository;
        this.batchResolutionService = batchResolutionService;
        this.restTemplate = restTemplate;
    }

    // ─── Single manual prediction (raw feature map) ──────────────────────────
    public ExpiryRiskResponse predictRisk(ExpiryRiskRequest request) {
        ExpiryRiskRequest safeRequest = sanitizeRequest(request);
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<ExpiryRiskRequest> entity = new HttpEntity<>(safeRequest, headers);
        try {
            ResponseEntity<ExpiryRiskResponse> response = restTemplate.exchange(
                    mlApiBaseUrl + "/predict",
                    HttpMethod.POST,
                    entity,
                    ExpiryRiskResponse.class
            );

            ExpiryRiskResponse body = response.getBody();
            if (body != null && body.getDecision_threshold() == null) {
                body.setDecision_threshold(riskThreshold);
            }
            if (body != null && body.getSell_through_before_expiry_probability() == null) {
                body.setSell_through_before_expiry_probability(
                        complementProbability(body.getExpiry_risk_probability())
                );
            }
            if (body != null) {
                RiskBusinessDecision decision = mapRiskAction(
                        body.getExpiry_risk_probability(),
                        safeRequest.getDays_until_expiry()
                );
                if (body.getRisk_label() == null || body.getRisk_label().isBlank()) {
                    body.setRisk_label(decision.riskLabel);
                }
                if (body.getSuggested_action() == null || body.getSuggested_action().isBlank()) {
                    body.setSuggested_action(decision.suggestedAction);
                }
                if (body.getSuggested_discount_pct() == null) {
                    body.setSuggested_discount_pct(decision.suggestedDiscountPct);
                }
            }
            if (body != null && body.getEngineered_features() == null) {
                body.setEngineered_features(buildEngineeredFeatureSummary(safeRequest));
            }
            return body;
        } catch (Exception ex) {
            log.warn("ML API prediction failed, using fallback rule: {}", ex.getMessage());
            return buildFallbackPrediction(safeRequest);
        }
    }

    // ─── Single batch prediction (auto-derives features from DB) ─────────────
    public ExpiryRiskResponse predictFromBatch(Long batchId) {

        // Build from live sales/inventory data, call ML/fallback, and persist.
        Batch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new RuntimeException("Batch not found: " + batchId));
        ExpiryRiskResponse result = predictRisk(buildFeaturesForBatch(batch));







        // 8. Categorical features — from arrival date

        // 9. demand_variability — coefficient of variation of daily sale quantities.

        // 10. spoilage_sensitivity — product-level perishability stored on the Product entity.


        if (result != null) {
            batch.setLastRiskLabel(result.getRisk_label());
            batch.setLastRiskProbability(result.getExpiry_risk_probability());
            batch.setLastPredictedAt(LocalDateTime.now());
            result.setImpact_score(batch.computeImpactScore(result.getExpiry_risk_probability()));
            batch = batchRepository.save(batch);
            batch = batchResolutionService.refreshBatchStatus(batch);
            savePredictionHistory(batch, result, "BATCH");
        }

        return result;
    }

    // ─── Improvement #8: Bulk prediction via a SINGLE HTTP call ──────────────
    // Previously: N batches = N HTTP calls (one per batch) → very slow.
    // Now: all N batches are sent in one POST to /predict-batch.
    // The ML API processes them all and returns one list of results.
    // This makes the daily scheduled scan of 200 batches roughly 100x faster.
    public Map<String, Object> predictAllBatches() {

        // ── Improvement #19: Only load batches with quantity > 0 from DB ──────
        // Previously: batchRepository.findAll() loaded ALL batches (including
        // sold-out ones) and then skipped them in a Java loop, wasting memory.
        // Now: the DB does the filter and only active batches are returned.
        List<Batch> activeBatches = batchRepository.findByQuantityGreaterThan(0);

        // Build the list of feature payloads to send to /predict-batch
        List<Map<String, Object>> mlPayload = new ArrayList<>();
        Map<Long, ExpiryRiskRequest> featureRequestsByBatchId = new HashMap<>();

        for (Batch batch : activeBatches) {
            try {
                ExpiryRiskRequest features = buildFeaturesForBatch(batch);
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("batch_id", batch.getId());
                item.put("features", features);
                mlPayload.add(item);
                featureRequestsByBatchId.put(batch.getId(), features);
            } catch (Exception e) {
                log.warn("Could not build features for batch {}: {}", batch.getId(), e.getMessage());
            }
        }

        if (mlPayload.isEmpty()) {
            return Map.of("highRisk", 0, "warning", 0, "lowRisk", 0, "failed", 0,
                    "ranAt", LocalDateTime.now().toString());
        }

        // ── Single HTTP call to /predict-batch ──────────────────────────────
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<List<Map<String, Object>>> response;
        try {
            response = restTemplate.exchange(
                    mlApiBaseUrl + "/predict-batch",
                    HttpMethod.POST,
                    new HttpEntity<>(mlPayload, headers),
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
        } catch (Exception e) {
            log.warn("Bulk ML call to /predict-batch failed, using fallback rule: {}", e.getMessage());
            return buildFallbackBulkResult(activeBatches, featureRequestsByBatchId, e.getMessage());
        }

        List<Map<String, Object>> results = response.getBody();
        if (results == null) results = Collections.emptyList();

        // Build a quick lookup: batchId → Batch entity for saving results
        Map<Long, Batch> batchById = new HashMap<>();
        for (Batch b : activeBatches) batchById.put(b.getId(), b);

        int high = 0, warning = 0, low = 0, failed = 0;

        for (Map<String, Object> res : results) {
            Object batchIdObj   = res.get("batch_id");
            Object riskLabelObj = res.get("risk_label");
            Object probObj      = res.get("expiry_risk_probability");
            Object sellThroughObj = res.get("sell_through_before_expiry_probability");
            Object suggestedDiscountObj = res.get("suggested_discount_pct");
            Object errorObj     = res.get("error");

            if (batchIdObj == null) continue;
            Long batchId = ((Number) batchIdObj).longValue();

            if (errorObj != null) {
                log.warn("Prediction error for batch {}: {}", batchId, errorObj);
                failed++;
                continue;
            }

            String riskLabel = riskLabelObj != null ? String.valueOf(riskLabelObj) : null;
            Double prob      = probObj instanceof Number ? ((Number) probObj).doubleValue() : null;
            Double sellThrough = sellThroughObj instanceof Number
                    ? ((Number) sellThroughObj).doubleValue()
                    : null;
            Double suggestedDiscount = suggestedDiscountObj instanceof Number
                    ? ((Number) suggestedDiscountObj).doubleValue()
                    : null;

            // Persist result to the batch row
            Batch batch = batchById.get(batchId);
            if (batch != null && riskLabel != null) {
                batch.setLastRiskLabel(riskLabel);
                batch.setLastRiskProbability(prob);
                batch.setLastPredictedAt(LocalDateTime.now());
                batch = batchRepository.save(batch);
                batch = batchResolutionService.refreshBatchStatus(batch);
                ExpiryRiskResponse snapshotResponse = new ExpiryRiskResponse();
                snapshotResponse.setRisk_label(riskLabel);
                snapshotResponse.setExpiry_risk_probability(prob != null ? prob : 0.0);
                snapshotResponse.setSell_through_before_expiry_probability(
                        sellThrough != null ? sellThrough : complementProbability(prob != null ? prob : 0.0)
                );
                snapshotResponse.setSuggested_discount_pct(
                        suggestedDiscount != null ? suggestedDiscount : suggestedDiscountPctForProbability(prob != null ? prob : 0.0)
                );
                snapshotResponse.setImpact_score(batch.computeImpactScore(prob != null ? prob : 0.0));
                snapshotResponse.setDecision_threshold(riskThreshold);
                snapshotResponse.setPrediction_source(stringOrDefault(res.get("prediction_source"), "MODEL"));
                savePredictionHistory(batch, snapshotResponse, "BULK");
            }

            switch (riskLabel != null ? riskLabel : "") {
                case "High Risk" -> high++;
                case "Warning"   -> warning++;
                default          -> low++;
            }
        }

        log.info("Bulk prediction complete — High: {}, Warning: {}, Low: {}, Failed: {}",
                high, warning, low, failed);

        return Map.of(
                "highRisk",  high,
                "warning",   warning,
                "lowRisk",   low,
                "failed",    failed,
                "ranAt",     LocalDateTime.now().toString()
        );
    }

    // ─── Helper: build the ML feature map for one batch ──────────────────────
    // Extracted into its own method so both single and bulk prediction reuse it.
    private ExpiryRiskRequest buildFeaturesForBatch(Batch batch) {
        if (Boolean.TRUE.equals(Boolean.TRUE)) {
            return buildLiveModelFeaturesForBatch(batch);
        }

        Product product   = batch.getProduct();
        LocalDate today   = LocalDate.now();
        LocalDate arrival = batch.getAddedDate() != null ? batch.getAddedDate() : today;

        long daysToExpiryAtArrival = Math.max(
                ChronoUnit.DAYS.between(arrival, batch.getExpiryDate()), 0);

        List<Sale> allSales = saleRepository.findByProductAndStatus(product, SaleStatus.ACTIVE);
        int lifetimeSold = allSales.stream()
                .mapToInt(s -> s.getQuantitySold() != null ? s.getQuantitySold() : 0).sum();

        double initialQuantity  = batch.getQuantity() + lifetimeSold;
        long   daysSinceArrival = ChronoUnit.DAYS.between(arrival, today);
        double avgDailySales    = daysSinceArrival > 0
                ? (double) lifetimeSold / daysSinceArrival : 0.0;
        double stockPressure   = initialQuantity / Math.max(avgDailySales, 1.0);

        int isWeekend = (arrival.getDayOfWeek().getValue() == 6
                      || arrival.getDayOfWeek().getValue() == 7) ? 1 : 0;

        double demandVariability = 0.3;
        if (!allSales.isEmpty()) {
            Map<LocalDate, Integer> dailyTotals = new HashMap<>();
            for (Sale s : allSales) {
                dailyTotals.merge(s.getSaleDate(),
                        s.getQuantitySold() != null ? s.getQuantitySold() : 0,
                        Integer::sum);
            }
            if (dailyTotals.size() >= 2) {
                double mean = dailyTotals.values().stream()
                        .mapToInt(Integer::intValue).average().orElse(1.0);
                if (mean > 0) {
                    double variance = dailyTotals.values().stream()
                            .mapToDouble(q -> Math.pow(q - mean, 2))
                            .average().orElse(0.0);
                    demandVariability = Math.min(Math.sqrt(variance) / mean, 3.0);
                }
            }
        }

        ExpiryRiskRequest req = new ExpiryRiskRequest();
        req.setDays_to_expiry_at_arrival(daysToExpiryAtArrival);
        req.setInitial_quantity(initialQuantity);
        req.setAverage_daily_sales(avgDailySales);
        req.setStock_pressure_ratio(stockPressure);
        req.setCategory(product.getCategory() != null ? product.getCategory() : "Other");
        req.setIs_weekend(isWeekend);
        req.setMonth(arrival.getMonthValue());
        req.setDemand_variability(demandVariability);
        req.setSpoilage_sensitivity(product.getSpoilageSensitivity());
        return sanitizeRequest(req);
    }

    // â”€â”€â”€ Guard rails to keep bad/empty ML inputs from reaching the model â”€â”€â”€
    // --- Guard rails to keep bad/empty ML inputs from reaching the model ---
    private ExpiryRiskRequest buildLiveModelFeaturesForBatch(Batch batch) {
        Product product = batch.getProduct();
        LocalDate today = LocalDate.now();
        LocalDate arrival = batch.getAddedDate() != null ? batch.getAddedDate() : today;
        LocalDate expiry = batch.getExpiryDate() != null ? batch.getExpiryDate() : today;

        double daysUntilExpiry = Math.max(ChronoUnit.DAYS.between(today, expiry), 0);
        double daysToExpiryAtArrival = Math.max(ChronoUnit.DAYS.between(arrival, expiry), 0);
        double shelfLifeDays = Math.max(daysToExpiryAtArrival, Math.max(daysUntilExpiry, 1));
        double remainingQuantity = Math.max(batch.getQuantity() != null ? batch.getQuantity() : 0, 0);

        List<Sale> batchSales = saleRepository.findByBatchAndStatus(batch, SaleStatus.ACTIVE);
        if (batchSales == null || batchSales.isEmpty()) {
            batchSales = saleRepository.findByProductAndStatus(product, SaleStatus.ACTIVE);
        }
        double unitsSold = sumSold(batchSales);
        double initialQuantity = remainingQuantity + unitsSold;

        List<Sale> recentProductSales = saleRepository.findByProductAndSaleDateBetweenAndStatus(
                product,
                today.minusDays(30),
                today,
                SaleStatus.ACTIVE
        );
        double dailyDemand = sumSold(recentProductSales) / 30.0;

        long daysSinceArrival = Math.max(ChronoUnit.DAYS.between(arrival, today), 1);
        double batchDailyDemand = unitsSold / daysSinceArrival;
        if (batchDailyDemand > 0) {
            dailyDemand = dailyDemand > 0 ? Math.max(dailyDemand, batchDailyDemand) : batchDailyDemand;
        }

        double sellThroughRate = safeDivide(unitsSold, initialQuantity);
        double stockPressure = safeDivide(remainingQuantity, Math.max(dailyDemand, 1.0));
        double velocityScore = safeDivide(dailyDemand, Math.max(shelfLifeDays, 1.0));
        double salesVolatility = computeDemandVariability(recentProductSales);
        double expiryPressureIndex = safeDivide(stockPressure, daysUntilExpiry + 1.0);
        double sellingPrice = product != null && product.getSellingPrice() != null ? product.getSellingPrice() : 0.0;
        double costPrice = product != null && product.getCostPrice() != null ? product.getCostPrice() : 0.0;
        double priceMarginRatio = sellingPrice > 0 ? safeDivide(sellingPrice - costPrice, sellingPrice) : 0.4494;

        ExpiryRiskRequest req = new ExpiryRiskRequest();
        req.setDays_until_expiry(daysUntilExpiry);
        req.setDays_to_expiry_at_arrival(daysToExpiryAtArrival);
        req.setInitial_quantity(initialQuantity);
        req.setShelf_life_days(shelfLifeDays);
        req.setStorage_temp(defaultStorageTemp(product));
        req.setTemp_deviation(1.4);
        req.setSpoilage_sensitivity(product != null ? product.getSpoilageSensitivity() : 0.5);
        req.setUnits_sold(unitsSold);
        req.setDaily_demand(dailyDemand);
        req.setAverage_daily_sales(dailyDemand);
        req.setSell_through_rate(sellThroughRate);
        req.setRemaining_quantity(remainingQuantity);
        req.setStock_pressure_ratio(stockPressure);
        req.setVelocity_score(velocityScore);
        req.setSales_volatility(salesVolatility);
        req.setDemand_variability(salesVolatility);
        req.setExpiry_pressure_index(expiryPressureIndex);
        req.setPrice_margin_ratio(priceMarginRatio);
        req.setCategory(product != null && product.getCategory() != null ? product.getCategory() : "Other");
        req.setCategory_encoded(encodeCategory(req.getCategory()));
        req.setRegion_encoded(2);
        req.setIs_weekend(isWeekend(arrival));
        req.setMonth(arrival.getMonthValue());
        req.setIs_promoted(0);
        req.setHandling_score(7.0);
        req.setPackaging_score(7.0);
        req.setSupplier_score(9.0);
        return sanitizeRequest(req);
    }

    private double sumSold(List<Sale> sales) {
        if (sales == null) return 0.0;
        return sales.stream()
                .mapToDouble(sale -> sale.getQuantitySold() != null ? sale.getQuantitySold() : 0)
                .sum();
    }

    private double computeDemandVariability(List<Sale> sales) {
        if (sales == null || sales.isEmpty()) return 0.3;
        Map<LocalDate, Integer> dailyTotals = new HashMap<>();
        for (Sale sale : sales) {
            if (sale.getSaleDate() == null) continue;
            dailyTotals.merge(
                    sale.getSaleDate(),
                    sale.getQuantitySold() != null ? sale.getQuantitySold() : 0,
                    Integer::sum
            );
        }
        if (dailyTotals.size() < 2) return 0.3;
        double mean = dailyTotals.values().stream().mapToInt(Integer::intValue).average().orElse(0.0);
        if (mean <= 0) return 0.3;
        double variance = dailyTotals.values().stream()
                .mapToDouble(qty -> Math.pow(qty - mean, 2))
                .average()
                .orElse(0.0);
        return clamp(Math.sqrt(variance) / mean, 0.0, 3.0);
    }

    private int isWeekend(LocalDate date) {
        int day = date.getDayOfWeek().getValue();
        return day == 6 || day == 7 ? 1 : 0;
    }

    private double defaultStorageTemp(Product product) {
        String category = normalizeCategory(product != null ? product.getCategory() : null);
        if ("Frozen_Meals".equals(category)) return -18.0;
        if ("Pharmaceuticals".equals(category)) return 5.0;
        if ("Bakery".equals(category)) return 20.0;
        return 4.0;
    }

    private int encodeCategory(String rawCategory) {
        return switch (normalizeCategory(rawCategory)) {
            case "Bakery" -> 0;
            case "Beverages" -> 1;
            case "Dairy" -> 2;
            case "Deli" -> 3;
            case "Frozen_Meals" -> 4;
            case "Meat" -> 5;
            case "Pharmaceuticals" -> 6;
            case "Produce" -> 7;
            case "Ready_to_Eat" -> 8;
            case "Seafood" -> 9;
            default -> 5;
        };
    }

    private String normalizeCategory(String rawCategory) {
        if (rawCategory == null || rawCategory.trim().isEmpty()) return "Other";
        String value = rawCategory.trim().replace("-", "_").replace(" ", "_");
        String lower = value.toLowerCase(Locale.ROOT);
        if (lower.contains("bakery") || lower.contains("bread")) return "Bakery";
        if (lower.contains("beverage") || lower.contains("drink") || lower.contains("juice")) return "Beverages";
        if (lower.contains("dairy") || lower.contains("milk")) return "Dairy";
        if (lower.contains("deli")) return "Deli";
        if (lower.contains("frozen")) return "Frozen_Meals";
        if (lower.contains("meat") || lower.contains("chicken") || lower.contains("beef")) return "Meat";
        if (lower.contains("pharma") || lower.contains("medicine") || lower.contains("vaccine")) return "Pharmaceuticals";
        if (lower.contains("produce") || lower.contains("fruit") || lower.contains("vegetable")) return "Produce";
        if (lower.contains("ready")) return "Ready_to_Eat";
        if (lower.contains("seafood") || lower.contains("fish") || lower.contains("shrimp")) return "Seafood";
        return value;
    }

    private ExpiryRiskRequest sanitizeRequest(ExpiryRiskRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("ExpiryRiskRequest is required.");
        }
        if (Boolean.TRUE.equals(Boolean.TRUE)) {
            return sanitizeLiveModelRequest(request);
        }

        ExpiryRiskRequest clean = new ExpiryRiskRequest();

        clean.setDays_to_expiry_at_arrival(nonNegative(safeValue(request.getDays_to_expiry_at_arrival(), 0.0)));
        clean.setInitial_quantity(nonNegative(safeValue(request.getInitial_quantity(), 0.0)));
        clean.setAverage_daily_sales(nonNegative(safeValue(request.getAverage_daily_sales(), 0.0)));
        clean.setStock_pressure_ratio(nonNegative(safeValue(request.getStock_pressure_ratio(), 0.0)));

        String category = request.getCategory();
        if (category == null || category.trim().isEmpty()) category = "Other";
        clean.setCategory(category.trim());

        int isWeekend = request.getIs_weekend() == 1 ? 1 : 0;
        clean.setIs_weekend(isWeekend);

        int month = request.getMonth();
        if (month < 1 || month > 12) month = LocalDate.now().getMonthValue();
        clean.setMonth(month);

        double demandVar = clamp(safeValue(request.getDemand_variability(), 0.3), 0.0, 3.0);
        clean.setDemand_variability(demandVar);

        double spoilage = clamp(safeValue(request.getSpoilage_sensitivity(), 0.5), 0.0, 1.0);
        clean.setSpoilage_sensitivity(spoilage);

        return clean;
    }

    private ExpiryRiskRequest sanitizeLiveModelRequest(ExpiryRiskRequest request) {
        ExpiryRiskRequest clean = new ExpiryRiskRequest();

        double daysUntilExpiry = nonNegative(safeValue(request.getDays_until_expiry(), request.getDays_to_expiry_at_arrival()));
        double shelfLifeDays = nonNegative(safeValue(request.getShelf_life_days(), request.getDays_to_expiry_at_arrival()));
        if (shelfLifeDays <= 0) shelfLifeDays = Math.max(daysUntilExpiry, 1.0);

        double initialQuantity = nonNegative(safeValue(request.getInitial_quantity(), 0.0));
        double unitsSold = nonNegative(safeValue(request.getUnits_sold(), 0.0));
        double remainingQuantity = nonNegative(safeValue(request.getRemaining_quantity(), 0.0));
        if (remainingQuantity <= 0 && initialQuantity > 0 && unitsSold <= 0) {
            remainingQuantity = initialQuantity;
        } else if (remainingQuantity <= 0 && initialQuantity > 0) {
            remainingQuantity = Math.max(initialQuantity - unitsSold, 0.0);
        }
        if (initialQuantity <= 0) initialQuantity = remainingQuantity + unitsSold;

        double dailyDemand = nonNegative(safeValue(request.getDaily_demand(), request.getAverage_daily_sales()));
        double sellThroughRate = clamp(
                safeValue(request.getSell_through_rate(), safeDivide(unitsSold, initialQuantity)),
                0.0,
                1.0
        );
        double stockPressure = nonNegative(safeValue(
                request.getStock_pressure_ratio(),
                safeDivide(remainingQuantity, Math.max(dailyDemand, 1.0))
        ));
        double velocityScore = nonNegative(safeValue(
                request.getVelocity_score(),
                safeDivide(dailyDemand, Math.max(shelfLifeDays, 1.0))
        ));
        double salesVolatilityInput = request.getSales_volatility();
        if (Math.abs(salesVolatilityInput - 0.3) < 0.000001 && Math.abs(request.getDemand_variability() - 0.3) > 0.000001) {
            salesVolatilityInput = request.getDemand_variability();
        }
        double salesVolatility = clamp(safeValue(salesVolatilityInput, request.getDemand_variability()), 0.0, 3.0);
        double expiryPressure = nonNegative(safeValue(
                request.getExpiry_pressure_index(),
                safeDivide(stockPressure, daysUntilExpiry + 1.0)
        ));

        String category = request.getCategory();
        if (category == null || category.trim().isEmpty()) category = "Other";

        int month = request.getMonth();
        if (month < 1 || month > 12) month = LocalDate.now().getMonthValue();

        clean.setDays_until_expiry(daysUntilExpiry);
        clean.setDays_to_expiry_at_arrival(nonNegative(safeValue(request.getDays_to_expiry_at_arrival(), shelfLifeDays)));
        clean.setInitial_quantity(initialQuantity);
        clean.setShelf_life_days(shelfLifeDays);
        clean.setStorage_temp(safeValue(request.getStorage_temp(), 4.0));
        clean.setTemp_deviation(nonNegative(safeValue(request.getTemp_deviation(), 1.4)));
        clean.setSpoilage_sensitivity(clamp(safeValue(request.getSpoilage_sensitivity(), 0.5), 0.0, 1.0));
        clean.setUnits_sold(unitsSold);
        clean.setDaily_demand(dailyDemand);
        clean.setAverage_daily_sales(dailyDemand);
        clean.setSell_through_rate(sellThroughRate);
        clean.setRemaining_quantity(remainingQuantity);
        clean.setStock_pressure_ratio(stockPressure);
        clean.setVelocity_score(velocityScore);
        clean.setSales_volatility(salesVolatility);
        clean.setDemand_variability(salesVolatility);
        clean.setExpiry_pressure_index(expiryPressure);
        clean.setPrice_margin_ratio(clamp(safeValue(request.getPrice_margin_ratio(), 0.4494), -1.0, 1.0));
        clean.setCategory(category.trim());
        clean.setCategory_encoded(encodeCategory(category));
        clean.setRegion_encoded(request.getRegion_encoded() >= 0 ? request.getRegion_encoded() : 2);
        clean.setIs_weekend(request.getIs_weekend() == 1 ? 1 : 0);
        clean.setMonth(month);
        clean.setIs_promoted(request.getIs_promoted() == 1 ? 1 : 0);
        clean.setHandling_score(clamp(safeValue(request.getHandling_score(), 7.0), 0.0, 10.0));
        clean.setPackaging_score(clamp(safeValue(request.getPackaging_score(), 7.0), 0.0, 10.0));
        clean.setSupplier_score(clamp(safeValue(request.getSupplier_score(), 9.0), 0.0, 10.0));
        return clean;
    }

    private double safeValue(double value, double fallback) {
        return Double.isFinite(value) ? value : fallback;
    }

    private double nonNegative(double value) {
        return value < 0 ? 0.0 : value;
    }

    private double clamp(double value, double min, double max) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }

    // ─── Risk summary from persisted labels (no ML call) ─────────────────────
    public Map<String, Object> getRiskSummary() {
        List<Batch> all = batchRepository.findAll();

        int high = 0, warning = 0, low = 0, unscanned = 0;
        LocalDateTime lastRun = null;

        for (Batch b : all) {
            if (b.getQuantity() == null || b.getQuantity() <= 0) continue;
            if (b.getLastRiskLabel() == null) {
                unscanned++;
                continue;
            }
            switch (b.getLastRiskLabel()) {
                case "High Risk" -> high++;
                case "Warning"   -> warning++;
                default          -> low++;
            }
            if (lastRun == null || (b.getLastPredictedAt() != null && b.getLastPredictedAt().isAfter(lastRun))) {
                lastRun = b.getLastPredictedAt();
            }
        }

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("highRisk",  high);
        summary.put("warning",   warning);
        summary.put("lowRisk",   low);
        summary.put("unscanned", unscanned);
        summary.put("lastRunAt", lastRun != null ? lastRun.toString() : null);
        summary.put("autoScanEnabled", autoScanEnabled);
        summary.put("autoScanIntervalMs", autoScanFixedDelayMs);
        return summary;
    }

    public Map<String, Object> getValidationSummary() {
        List<Batch> batches = batchRepository.findAll();
        List<WasteRecord> wasteRecords = wasteRecordRepository.findAll();

        Map<Long, Integer> wastedByBatchId = new HashMap<>();
        for (WasteRecord record : wasteRecords) {
            if (record.getBatch() == null || record.getBatch().getId() == null) {
                continue;
            }
            int wastedQty = record.getQuantityWasted() != null ? record.getQuantityWasted() : 0;
            wastedByBatchId.merge(record.getBatch().getId(), wastedQty, Integer::sum);
        }

        int truePositive = 0;
        int falsePositive = 0;
        int trueNegative = 0;
        int falseNegative = 0;
        int unresolved = 0;
        int withoutPrediction = 0;
        int actualWasteCount = 0;
        int actualSafeCount = 0;

        double totalProbability = 0.0;
        double probabilityForWasted = 0.0;
        double probabilityForSafe = 0.0;
        double brierScoreSum = 0.0;

        List<Map<String, Object>> sampleRows = new ArrayList<>();

        for (Batch batch : batches) {
            Double probability = batch.getLastRiskProbability();
            if (probability == null || batch.getLastPredictedAt() == null) {
                withoutPrediction++;
                continue;
            }

            int wastedUnits = wastedByBatchId.getOrDefault(batch.getId(), 0);
            BatchResolutionStatus resolutionStatus = batchResolutionService.determineStatus(batch);
            boolean actualWasted = isActualWasteOutcome(resolutionStatus, wastedUnits);
            boolean resolved = isResolvedForValidation(resolutionStatus);

            if (!resolved) {
                unresolved++;
                continue;
            }

            boolean predictedWasted = isPredictedWaste(probability);
            int actualLabel = actualWasted ? 1 : 0;

            totalProbability += probability;
            brierScoreSum += Math.pow(probability - actualLabel, 2);

            if (actualWasted) {
                actualWasteCount++;
                probabilityForWasted += probability;
            } else {
                actualSafeCount++;
                probabilityForSafe += probability;
            }

            if (predictedWasted && actualWasted) {
                truePositive++;
            } else if (predictedWasted) {
                falsePositive++;
            } else if (actualWasted) {
                falseNegative++;
            } else {
                trueNegative++;
            }

            if (sampleRows.size() < 5) {
                Map<String, Object> sample = new LinkedHashMap<>();
                sample.put("batchId", batch.getId());
                sample.put("batchNumber", batch.getBatchNumber());
                sample.put("predictedProbability", round(probability));
                sample.put("predictedLabel", predictedWasted ? "Waste Expected" : "Safe Expected");
                sample.put("actualOutcome", actualWasted ? "Wasted" : "No Waste");
                sample.put("wastedUnits", wastedUnits);
                sampleRows.add(sample);
            }
        }

        int evaluated = truePositive + falsePositive + trueNegative + falseNegative;
        double accuracy = safeDivide(truePositive + trueNegative, evaluated);
        double precision = safeDivide(truePositive, truePositive + falsePositive);
        double recall = safeDivide(truePositive, truePositive + falseNegative);
        double f1 = (precision + recall) > 0
                ? (2 * precision * recall) / (precision + recall)
                : 0.0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("threshold", round(riskThreshold));
        result.put("evaluatedBatchCount", evaluated);
        result.put("unresolvedBatchCount", unresolved);
        result.put("batchesWithoutPrediction", withoutPrediction);
        result.put("actualWasteCount", actualWasteCount);
        result.put("actualSafeCount", actualSafeCount);
        result.put("accuracy", round(accuracy));
        result.put("precision", round(precision));
        result.put("recall", round(recall));
        result.put("f1Score", round(f1));
        result.put("brierScore", evaluated > 0 ? round(brierScoreSum / evaluated) : 0.0);
        result.put("averagePredictedProbability", evaluated > 0 ? round(totalProbability / evaluated) : 0.0);
        result.put("averageProbabilityForActuallyWasted",
                actualWasteCount > 0 ? round(probabilityForWasted / actualWasteCount) : 0.0);
        result.put("averageProbabilityForActuallySafe",
                actualSafeCount > 0 ? round(probabilityForSafe / actualSafeCount) : 0.0);
        result.put("confusionMatrix", Map.of(
                "truePositive", truePositive,
                "falsePositive", falsePositive,
                "trueNegative", trueNegative,
                "falseNegative", falseNegative
        ));
        result.put("interpretation", buildValidationInterpretation(evaluated, precision, recall, f1));
        result.put("notes", List.of(
                "Only resolved batches are evaluated.",
                "Resolved statuses are SOLD_OUT, WASTED, and EXPIRED_ON_SHELF.",
                "EXPIRED_ON_SHELF is treated as a real bad outcome even if waste was not logged yet.",
                "Active batches are excluded so the validation stays honest."
        ));
        result.put("sampleRows", sampleRows);
        return result;
    }

    public List<Map<String, Object>> getValidationTrend() {
        List<BatchRiskPrediction> predictions = batchRiskPredictionRepository.findAllWithBatchAndProduct();
        List<WasteRecord> wasteRecords = wasteRecordRepository.findAll();

        Map<Long, Integer> wastedByBatchId = new HashMap<>();
        for (WasteRecord record : wasteRecords) {
            if (record.getBatch() == null || record.getBatch().getId() == null) {
                continue;
            }
            int wastedQty = record.getQuantityWasted() != null ? record.getQuantityWasted() : 0;
            wastedByBatchId.merge(record.getBatch().getId(), wastedQty, Integer::sum);
        }

        Map<YearMonth, Map<Long, BatchRiskPrediction>> latestByMonthAndBatch = new TreeMap<>();
        for (BatchRiskPrediction prediction : predictions) {
            if (prediction.getBatch() == null || prediction.getBatch().getId() == null || prediction.getPredictedAt() == null) {
                continue;
            }
            YearMonth month = YearMonth.from(prediction.getPredictedAt());
            latestByMonthAndBatch
                    .computeIfAbsent(month, ignored -> new HashMap<>())
                    .merge(prediction.getBatch().getId(), prediction, (left, right) ->
                            right.getPredictedAt().isAfter(left.getPredictedAt()) ? right : left);
        }

        List<Map<String, Object>> trend = new ArrayList<>();
        for (Map.Entry<YearMonth, Map<Long, BatchRiskPrediction>> entry : latestByMonthAndBatch.entrySet()) {
            int tp = 0, fp = 0, tn = 0, fn = 0;
            int evaluated = 0;

            for (BatchRiskPrediction prediction : entry.getValue().values()) {
                Batch batch = prediction.getBatch();
                BatchResolutionStatus resolutionStatus = batchResolutionService.determineStatus(batch);
                if (!isResolvedForValidation(resolutionStatus)) {
                    continue;
                }

                int wastedUnits = wastedByBatchId.getOrDefault(batch.getId(), 0);
                boolean actualWasted = isActualWasteOutcome(resolutionStatus, wastedUnits);
                boolean predictedWasted = isPredictedWaste(prediction.getRiskProbability());

                evaluated++;
                if (predictedWasted && actualWasted) tp++;
                else if (predictedWasted) fp++;
                else if (actualWasted) fn++;
                else tn++;
            }

            double precision = safeDivide(tp, tp + fp);
            double recall = safeDivide(tp, tp + fn);
            double f1 = (precision + recall) > 0
                    ? (2 * precision * recall) / (precision + recall)
                    : 0.0;

            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month", entry.getKey().toString());
            row.put("evaluatedBatchCount", evaluated);
            row.put("precision", round(precision));
            row.put("recall", round(recall));
            row.put("f1Score", round(f1));
            row.put("truePositive", tp);
            row.put("falsePositive", fp);
            row.put("trueNegative", tn);
            row.put("falseNegative", fn);
            trend.add(row);
        }

        return trend;
    }

    private void savePredictionHistory(Batch batch, ExpiryRiskResponse result, String source) {
        if (batch == null || batch.getId() == null || result == null) {
            return;
        }
        BatchRiskPrediction snapshot = new BatchRiskPrediction();
        snapshot.setBatch(batch);
        snapshot.setRiskLabel(result.getRisk_label() != null ? result.getRisk_label() : "Unknown");
        snapshot.setRiskProbability(result.getExpiry_risk_probability());
        snapshot.setImpactScore(result.getImpact_score() != null
                ? result.getImpact_score()
                : batch.computeImpactScore(result.getExpiry_risk_probability()));
        snapshot.setPredictionSource(source);
        snapshot.setPredictedAt(batch.getLastPredictedAt() != null ? batch.getLastPredictedAt() : LocalDateTime.now());
        batchRiskPredictionRepository.save(snapshot);
    }

    private Map<String, Object> buildFallbackBulkResult(List<Batch> activeBatches,
                                                        Map<Long, ExpiryRiskRequest> featureRequestsByBatchId,
                                                        String cause) {
        int high = 0;
        int warning = 0;
        int low = 0;
        int failed = 0;
        LocalDateTime predictedAt = LocalDateTime.now();

        for (Batch batch : activeBatches) {
            ExpiryRiskRequest request = featureRequestsByBatchId.get(batch.getId());
            if (request == null) {
                failed++;
                continue;
            }

            ExpiryRiskResponse fallback = buildFallbackPrediction(request);
            batch.setLastRiskLabel(fallback.getRisk_label());
            batch.setLastRiskProbability(fallback.getExpiry_risk_probability());
            batch.setLastPredictedAt(predictedAt);
            batch = batchRepository.save(batch);
            batch = batchResolutionService.refreshBatchStatus(batch);
            fallback.setImpact_score(batch.computeImpactScore(fallback.getExpiry_risk_probability()));
            savePredictionHistory(batch, fallback, "BULK_FALLBACK");

            switch (fallback.getRisk_label()) {
                case "High Risk" -> high++;
                case "Warning" -> warning++;
                default -> low++;
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("highRisk", high);
        result.put("warning", warning);
        result.put("lowRisk", low);
        result.put("failed", failed);
        result.put("fallbackUsed", true);
        result.put("fallbackReason", cause);
        result.put("threshold", round(riskThreshold));
        result.put("ranAt", predictedAt.toString());
        return result;
    }

    private ExpiryRiskResponse buildFallbackPrediction(ExpiryRiskRequest request) {
        double remainingQuantity = request.getRemaining_quantity();
        if (remainingQuantity <= 0) {
            ExpiryRiskResponse response = new ExpiryRiskResponse();
            response.setExpiry_risk_probability(0.0);
            response.setModel_expiry_risk_probability(0.0);
            response.setSell_through_before_expiry_probability(1.0);
            response.setSuggested_discount_pct(0.0);
            response.setEngineered_features(buildEngineeredFeatureSummary(request));
            applySalesPaceMetrics(response, buildSalesPaceMetrics(request));
            response.setPredicted_label(0);
            response.setRisk_label("Low Risk");
            response.setSuggested_action("No live stock remaining");
            response.setDecision_threshold(riskThreshold);
            response.setPrediction_source("FALLBACK_RULE");
            return response;
        }

        double daysToExpiry = request.getDays_until_expiry() > 0
                ? request.getDays_until_expiry()
                : request.getDays_to_expiry_at_arrival();

        if (daysToExpiry <= 0) {
            ExpiryRiskResponse response = new ExpiryRiskResponse();
            response.setExpiry_risk_probability(0.95);
            response.setModel_expiry_risk_probability(0.95);
            response.setSell_through_before_expiry_probability(0.05);
            response.setSuggested_discount_pct(0.0);
            response.setEngineered_features(buildEngineeredFeatureSummary(request));
            applySalesPaceMetrics(response, buildSalesPaceMetrics(request));
            response.setPredicted_label(1);
            response.setRisk_label("High Risk");
            response.setSuggested_action("Expired stock: remove from shelf and record waste");
            response.setDecision_threshold(riskThreshold);
            response.setPrediction_source("FALLBACK_RULE");
            return response;
        }

        double stockPressure = request.getStock_pressure_ratio();
        double spoilage = request.getSpoilage_sensitivity();
        double demandVariability = request.getSales_volatility();
        double avgDailySales = request.getDaily_demand() > 0
                ? request.getDaily_demand()
                : request.getAverage_daily_sales();
        double initialQuantity = request.getInitial_quantity();

        double probability = 0.08;
        if (daysToExpiry <= 0) probability += 0.55;
        else if (daysToExpiry <= 2) probability += 0.35;
        else if (daysToExpiry <= 5) probability += 0.22;
        else if (daysToExpiry <= 9) probability += 0.10;

        probability += Math.min(stockPressure / 20.0, 0.28);
        probability += Math.min(spoilage, 1.0) * 0.15;
        probability += Math.min(demandVariability / 3.0, 1.0) * 0.08;

        if (avgDailySales <= 0.1 && initialQuantity > 0) {
            probability += 0.07;
        }

        probability = clamp(probability, 0.02, 0.98);
        double fallbackModelProbability = probability;
        SalesPaceMetrics pace = buildSalesPaceMetrics(request);
        probability = clamp((fallbackModelProbability * 0.35) + (pace.riskProbability * 0.65), 0.0, 1.0);
        RiskBusinessDecision riskAction = mapRiskAction(probability, daysToExpiry);

        ExpiryRiskResponse response = new ExpiryRiskResponse();
        response.setExpiry_risk_probability(round(probability));
        response.setModel_expiry_risk_probability(round(fallbackModelProbability));
        response.setSell_through_before_expiry_probability(complementProbability(probability));
        response.setSuggested_discount_pct(riskAction.suggestedDiscountPct);
        response.setEngineered_features(buildEngineeredFeatureSummary(request));
        applySalesPaceMetrics(response, pace);
        response.setPredicted_label(isPredictedWaste(probability) ? 1 : 0);
        response.setRisk_label(riskAction.riskLabel);
        response.setSuggested_action(riskAction.suggestedAction);
        response.setDecision_threshold(riskThreshold);
        response.setPrediction_source("FALLBACK_RULE");
        return response;
    }

    private RiskBusinessDecision mapRiskAction(double probability, double daysToExpiry) {
        if (probability > 0.7) {
            return new RiskBusinessDecision("High Risk", "Show alert and suggest 30% discount", 30.0);
        }
        if (probability >= 0.4) {
            return new RiskBusinessDecision("Warning", "Monitor closely and consider 15% discount", 15.0);
        }
        return new RiskBusinessDecision("Low Risk", "No action needed", 0.0);
    }

    private double suggestedDiscountPctForProbability(double probability) {
        if (probability > 0.7) return 30.0;
        if (probability >= 0.4) return 15.0;
        return 0.0;
    }

    private Map<String, Double> buildEngineeredFeatureSummary(ExpiryRiskRequest request) {
        Map<String, Double> features = new LinkedHashMap<>();
        features.put("days_until_expiry", round(request.getDays_until_expiry()));
        features.put("initial_quantity", round(request.getInitial_quantity()));
        features.put("units_sold", round(request.getUnits_sold()));
        features.put("daily_demand", round(request.getDaily_demand()));
        features.put("sell_through_rate", round(request.getSell_through_rate()));
        features.put("remaining_quantity", round(request.getRemaining_quantity()));
        features.put("stock_pressure_ratio", round(request.getStock_pressure_ratio()));
        features.put("velocity_score", round(request.getVelocity_score()));
        features.put("expiry_pressure_index", round(request.getExpiry_pressure_index()));
        features.put("spoilage_sensitivity", round(request.getSpoilage_sensitivity()));
        features.put("packaging_score", round(request.getPackaging_score()));
        features.put("supplier_score", round(request.getSupplier_score()));
        return features;
    }

    private static class RiskBusinessDecision {
        private final String riskLabel;
        private final String suggestedAction;
        private final double suggestedDiscountPct;

        private RiskBusinessDecision(String riskLabel, String suggestedAction, double suggestedDiscountPct) {
            this.riskLabel = riskLabel;
            this.suggestedAction = suggestedAction;
            this.suggestedDiscountPct = suggestedDiscountPct;
        }
    }

    private boolean isPredictedWaste(Double probability) {
        return probability != null && probability >= riskThreshold;
    }

    private SalesPaceMetrics buildSalesPaceMetrics(ExpiryRiskRequest request) {
        double daysLeft = Math.max(request.getDays_until_expiry(), 0.0);
        double remainingQuantity = Math.max(request.getRemaining_quantity(), 0.0);
        double dailyDemand = Math.max(
                request.getDaily_demand() > 0 ? request.getDaily_demand() : request.getAverage_daily_sales(),
                0.0
        );

        SalesPaceMetrics metrics = new SalesPaceMetrics();
        if (remainingQuantity <= 0) {
            metrics.estimatedDaysToSell = 0.0;
            metrics.salesCapacityBeforeExpiry = 0.0;
            metrics.coverageRatio = 1.0;
            metrics.riskProbability = 0.0;
            metrics.sellThroughProbability = 1.0;
            metrics.message = "No live stock remaining.";
            return metrics;
        }

        if (dailyDemand <= 0) {
            metrics.estimatedDaysToSell = null;
            metrics.salesCapacityBeforeExpiry = 0.0;
            metrics.coverageRatio = 0.0;
            metrics.riskProbability = 1.0;
            metrics.sellThroughProbability = 0.0;
            metrics.message = "No recent daily sales pace is available, so stock is unlikely to clear without action.";
            return metrics;
        }

        double estimatedDaysToSell = remainingQuantity / dailyDemand;
        double salesCapacity = dailyDemand * daysLeft;
        double coverageRatio = clamp(salesCapacity / remainingQuantity, 0.0, 1.0);
        double gap = estimatedDaysToSell - daysLeft;
        double salesRisk = clamp(1.0 / (1.0 + Math.exp(-gap / 10.0)), 0.0, 1.0);

        metrics.estimatedDaysToSell = estimatedDaysToSell;
        metrics.salesCapacityBeforeExpiry = salesCapacity;
        metrics.coverageRatio = coverageRatio;
        metrics.riskProbability = salesRisk;
        metrics.sellThroughProbability = 1.0 - salesRisk;
        metrics.message = estimatedDaysToSell <= daysLeft
                ? String.format(Locale.US, "At the current sales pace, this stock needs about %.1f days to sell and has %.0f days left.", estimatedDaysToSell, daysLeft)
                : String.format(Locale.US, "At the current sales pace, this stock needs about %.1f days to sell but only has %.0f days left.", estimatedDaysToSell, daysLeft);
        return metrics;
    }

    private void applySalesPaceMetrics(ExpiryRiskResponse response, SalesPaceMetrics metrics) {
        response.setEstimated_days_to_sell(metrics.estimatedDaysToSell != null ? round(metrics.estimatedDaysToSell) : null);
        response.setSales_capacity_before_expiry(round(metrics.salesCapacityBeforeExpiry));
        response.setSales_pace_coverage_ratio(round(metrics.coverageRatio));
        response.setSales_pace_risk_probability(round(metrics.riskProbability));
        response.setSales_pace_sell_through_probability(round(metrics.sellThroughProbability));
        response.setSales_pace_message(metrics.message);
    }

    private static class SalesPaceMetrics {
        private Double estimatedDaysToSell;
        private double salesCapacityBeforeExpiry;
        private double coverageRatio;
        private double riskProbability;
        private double sellThroughProbability;
        private String message;
    }

    private String stringOrDefault(Object value, String fallback) {
        return value != null ? String.valueOf(value) : fallback;
    }

    private double complementProbability(double expiryRiskProbability) {
        return round(clamp(1.0 - expiryRiskProbability, 0.0, 1.0));
    }

    private boolean isResolvedForValidation(BatchResolutionStatus resolutionStatus) {
        return resolutionStatus == BatchResolutionStatus.SOLD_OUT
                || resolutionStatus == BatchResolutionStatus.WASTED
                || resolutionStatus == BatchResolutionStatus.EXPIRED_ON_SHELF;
    }

    private boolean isActualWasteOutcome(BatchResolutionStatus resolutionStatus, int wastedUnits) {
        return wastedUnits > 0
                || resolutionStatus == BatchResolutionStatus.WASTED
                || resolutionStatus == BatchResolutionStatus.EXPIRED_ON_SHELF;
    }

    private double safeDivide(double numerator, double denominator) {
        return denominator == 0 ? 0.0 : numerator / denominator;
    }

    private double round(double value) {
        return Math.round(value * 10000.0) / 10000.0;
    }

    private String buildValidationInterpretation(int evaluated, double precision, double recall, double f1) {
        if (evaluated == 0) {
            return "Not enough resolved predicted batches yet to judge live model quality.";
        }
        if (f1 < 0.6) {
            return "Live validation looks weak right now. The model is missing too many batches or raising too many false alarms.";
        }
        if (precision < 0.6) {
            return "The model catches waste, but it may be over-alerting in real life.";
        }
        if (recall < 0.6) {
            return "The model is being too cautious in real life and may be missing real waste cases.";
        }
        return "Live validation looks reasonably healthy on resolved batches.";
    }
}
