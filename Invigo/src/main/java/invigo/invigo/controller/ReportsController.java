package invigo.invigo.controller;

import invigo.invigo.entity.Batch;
import invigo.invigo.entity.Sale;
import invigo.invigo.entity.SaleStatus;
import invigo.invigo.entity.WasteRecord;
import invigo.invigo.repository.BatchRepository;
import invigo.invigo.repository.ProductRepository;
import invigo.invigo.repository.SaleRepository;
import invigo.invigo.repository.WasteRecordRepository;
import invigo.invigo.service.AuthorizationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/reports")
@CrossOrigin(origins = "*")
public class ReportsController {

    @Autowired private BatchRepository batchRepository;
    @Autowired private SaleRepository saleRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private WasteRecordRepository wasteRecordRepository;
    @Autowired private AuthorizationService authorizationService;

    // ── GET /api/reports/summary ───────────────────────────────────────────
    @GetMapping("/summary")
    public Map<String, Object> getSummary() {
        authorizationService.requireReportsView();
        LocalDate today = LocalDate.now();
        LocalDate cutoff = today.plusDays(7);

        List<Batch> allBatches   = batchRepository.findAll();
        List<Batch> expired      = batchRepository.findByExpiryDateBefore(today).stream()
                .filter(b -> b.getQuantity() != null && b.getQuantity() > 0)
                .toList();
        List<Batch> nearExpiry   = batchRepository.findByExpiryDateBetween(today, cutoff).stream()
                .filter(b -> b.getQuantity() != null && b.getQuantity() > 0)
                .toList();
        List<Sale>  activeSales  = saleRepository.findByStatus(SaleStatus.ACTIVE);
        List<WasteRecord> wasteRecords = wasteRecordRepository.findAllWithBatchAndProduct();

        LocalDateTime fromThisMonth = today.withDayOfMonth(1).atStartOfDay();
        LocalDateTime toThisMonth = today.plusDays(1).atStartOfDay().minusNanos(1);
        double currentMonthWasteLoss = sumWasteCost(
                wasteRecords.stream()
                        .filter(w -> !w.getRecordedAt().isBefore(fromThisMonth) && !w.getRecordedAt().isAfter(toThisMonth))
                        .toList()
        );
        int currentMonthWasteUnits = wasteRecords.stream()
                .filter(w -> !w.getRecordedAt().isBefore(fromThisMonth) && !w.getRecordedAt().isAfter(toThisMonth))
                .mapToInt(WasteRecord::getQuantityWasted)
                .sum();

        double expiredOnShelfLoss = expired.stream()
                .mapToDouble(b -> b.getQuantity() * b.getProduct().getCostPrice())
                .sum();
        double totalWasteLoss = sumWasteCost(wasteRecords);
        double totalRevenue = activeSales.stream()
                .mapToDouble(Sale::getLineTotal)
                .sum();

        Map<String, Object> result = new HashMap<>();
        result.put("totalBatches",    allBatches.size());
        result.put("expiredCount",    expired.size());
        result.put("nearExpiryCount", nearExpiry.size());
        result.put("freshCount",      allBatches.size() - expired.size() - nearExpiry.size());
        result.put("totalExpiredLoss", expiredOnShelfLoss);
        result.put("expiredOnShelfLoss", expiredOnShelfLoss);
        result.put("expiredOnShelfCount", expired.size());
        result.put("totalWasteLoss", totalWasteLoss);
        result.put("currentMonthWasteLoss", currentMonthWasteLoss);
        result.put("currentMonthWasteUnits", currentMonthWasteUnits);
        result.put("totalRevenue",    totalRevenue);
        result.put("totalProducts",   productRepository.count());
        result.put("totalSales",      activeSales.size());
        return result;
    }

    // ── GET /api/reports/expired-loss ─────────────────────────────────────
    @GetMapping("/expired-loss")
    public Map<String, Object> getExpiredLoss() {
        authorizationService.requireReportsView();
        LocalDate today = LocalDate.now();
        List<Batch> expired = batchRepository.findByExpiryDateBefore(today).stream()
                .filter(b -> b.getQuantity() != null && b.getQuantity() > 0)
                .toList();

        double totalLoss = expired.stream()
                .mapToDouble(b -> b.getQuantity() * b.getProduct().getCostPrice())
                .sum();

        List<Map<String, Object>> items = expired.stream().map(b -> {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("batchId",       b.getId());
            item.put("batchNumber",   b.getBatchNumber());
            item.put("productName",   b.getProduct().getName());
            item.put("category",      b.getProduct().getCategory());
            item.put("quantity",      b.getQuantity());
            item.put("costPrice",     b.getProduct().getCostPrice());
            item.put("expiryDate",    b.getExpiryDate().toString());
            item.put("estimatedLoss", b.getQuantity() * b.getProduct().getCostPrice());
            return item;
        }).collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("totalLoss", totalLoss);
        result.put("itemCount", expired.size());
        result.put("lossBasis", "EXPIRED_ON_SHELF");
        result.put("items",     items);
        return result;
    }

    // ── GET /api/reports/near-expiry ──────────────────────────────────────
    @GetMapping("/near-expiry")
    public Map<String, Object> getNearExpiry() {
        authorizationService.requireReportsView();
        LocalDate today  = LocalDate.now();
        LocalDate cutoff = today.plusDays(7);
        List<Batch> batches = batchRepository.findByExpiryDateBetween(today, cutoff);

        List<Map<String, Object>> items = batches.stream()
                .filter(b -> b.getQuantity() != null && b.getQuantity() > 0)
                .map(b -> {
            long daysLeft = java.time.temporal.ChronoUnit.DAYS.between(today, b.getExpiryDate());
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("batchId",     b.getId());
            item.put("batchNumber", b.getBatchNumber());
            item.put("productName", b.getProduct().getName());
            item.put("category",    b.getProduct().getCategory());
            item.put("supplier",    b.getProduct().getSupplier());
            item.put("quantity",    b.getQuantity());
            item.put("expiryDate",  b.getExpiryDate().toString());
            item.put("daysLeft",    daysLeft);
            item.put("riskLevel",   daysLeft <= 3 ? "Critical" : daysLeft <= 5 ? "High" : "Medium");
            return item;
        }).sorted(Comparator.comparingLong(m -> (Long) m.get("daysLeft")))
          .collect(Collectors.toList());

        Map<String, Object> result = new HashMap<>();
        result.put("count", items.size());
        result.put("items", items);
        return result;
    }

    // ── GET /api/reports/monthly-loss ─────────────────────────────────────
    @GetMapping("/monthly-loss")
    public List<Map<String, Object>> getMonthlyLoss() {
        authorizationService.requireReportsView();
        LocalDate today = LocalDate.now();
        List<WasteRecord> allWaste = wasteRecordRepository.findAllWithBatchAndProduct();

        // Group by YYYY-MM of waste logging date
        Map<String, Double> lossMap = new LinkedHashMap<>();
        Map<String, Integer> unitsMap = new LinkedHashMap<>();

        // Pre-fill last 6 months
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM yyyy");
        for (int i = 5; i >= 0; i--) {
            String key = today.minusMonths(i).format(fmt);
            lossMap.put(key, 0.0);
            unitsMap.put(key, 0);
        }

        for (WasteRecord record : allWaste) {
            String key = record.getRecordedAt().toLocalDate().format(fmt);
            if (lossMap.containsKey(key)) {
                double loss = wasteCost(record);
                lossMap.merge(key, loss, Double::sum);
                unitsMap.merge(key, record.getQuantityWasted(), Integer::sum);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (String month : lossMap.keySet()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month",      month);
            row.put("loss",       Math.round(lossMap.get(month) * 100.0) / 100.0);
            row.put("units",      unitsMap.get(month));
            result.add(row);
        }
        return result;
    }

    // ── GET /api/reports/product-movement ────────────────────────────────
    @GetMapping("/product-movement")
    public List<Map<String, Object>> getProductMovement() {
        authorizationService.requireReportsView();
        List<Sale> activeSales = saleRepository.findByStatus(SaleStatus.ACTIVE);

        // Group by product
        Map<Long, Map<String, Object>> productMap = new LinkedHashMap<>();
        for (Sale s : activeSales) {
            Long pid = s.getProduct().getId();
            productMap.computeIfAbsent(pid, k -> {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("productId",   pid);
                m.put("productName", s.getProduct().getName());
                m.put("category",    s.getProduct().getCategory());
                m.put("totalSold",   0);
                m.put("revenue",     0.0);
                return m;
            });
            Map<String, Object> row = productMap.get(pid);
            row.put("totalSold", (int) row.get("totalSold") + s.getQuantitySold());
            row.put("revenue",   Math.round(((double) row.get("revenue") + s.getLineTotal()) * 100.0) / 100.0);
        }

        // Sort by totalSold DESC, label fast/slow
        List<Map<String, Object>> sorted = productMap.values().stream()
                .sorted((a, b) -> Integer.compare((int) b.get("totalSold"), (int) a.get("totalSold")))
                .collect(Collectors.toList());

        int total = sorted.size();
        for (int i = 0; i < sorted.size(); i++) {
            String movement = (total <= 1) ? "Moderate"
                    : (i < total / 3)      ? "Fast"
                    : (i < (2 * total / 3))? "Moderate"
                    : "Slow";
            sorted.get(i).put("movement", movement);
        }
        return sorted;
    }

    // ── GET /api/reports/sales-vs-expiry ─────────────────────────────────
    @GetMapping("/sales-vs-expiry")
    public List<Map<String, Object>> getSalesVsExpiry() {
        authorizationService.requireReportsView();
        LocalDate today = LocalDate.now();
        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("MMM yyyy");

        // Sales revenue per month (last 6 months)
        Map<String, Double> revenueMap = new LinkedHashMap<>();
        Map<String, Double> lossMap    = new LinkedHashMap<>();
        for (int i = 5; i >= 0; i--) {
            String key = today.minusMonths(i).format(fmt);
            revenueMap.put(key, 0.0);
            lossMap.put(key, 0.0);
        }

        List<Sale> sales = saleRepository.findByStatus(SaleStatus.ACTIVE);
        for (Sale s : sales) {
            String key = s.getSaleDate().format(fmt);
            if (revenueMap.containsKey(key)) {
                revenueMap.merge(key, s.getLineTotal(), Double::sum);
            }
        }

        List<WasteRecord> allWaste = wasteRecordRepository.findAllWithBatchAndProduct();
        for (WasteRecord record : allWaste) {
            String key = record.getRecordedAt().toLocalDate().format(fmt);
            if (lossMap.containsKey(key)) {
                lossMap.merge(key, wasteCost(record), Double::sum);
            }
        }

        List<Map<String, Object>> result = new ArrayList<>();
        for (String month : revenueMap.keySet()) {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month",   month);
            row.put("revenue", Math.round(revenueMap.get(month) * 100.0) / 100.0);
            row.put("loss",    Math.round(lossMap.get(month) * 100.0) / 100.0);
            result.add(row);
        }
        return result;
    }

    private double sumWasteCost(List<WasteRecord> records) {
        return records.stream().mapToDouble(this::wasteCost).sum();
    }

    private double wasteCost(WasteRecord record) {
        if (record == null || record.getBatch() == null || record.getBatch().getProduct() == null) {
            return 0.0;
        }
        Double costPrice = record.getBatch().getProduct().getCostPrice();
        return record.getQuantityWasted() * (costPrice != null ? costPrice : 0.0);
    }
}
