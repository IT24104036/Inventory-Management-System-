package invigo.invigo.controller;

import invigo.invigo.entity.Sale;
import invigo.invigo.service.SaleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/sales")
@CrossOrigin(origins = "*")
public class SalesController {

    @Autowired
    private SaleService saleService;

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
    }

    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<Map<String, String>> handleConflict(IllegalStateException ex) {
        return ResponseEntity.status(409).body(Map.of("message", ex.getMessage()));
    }

    @PostMapping("/pos")
    public ResponseEntity<List<Sale>> createPosSale(@RequestBody SaleService.CreateSaleRequest request) {
        List<Sale> created = saleService.createPosSale(request);
        return ResponseEntity.ok(created);
    }

    @GetMapping
    public List<Sale> getAllSales() {
        return saleService.getAllSales();
    }

    @PutMapping("/{id}")
    public ResponseEntity<Sale> editSale(@PathVariable Long id, @RequestBody SaleService.EditSaleRequest request) {
        Sale updated = saleService.editSaleQuantity(id, request);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/{id}/void")
    public ResponseEntity<Sale> voidSale(
            @PathVariable Long id,
            @RequestBody SaleService.VoidSaleRequest request) {
        Sale voided = saleService.voidSale(id, request);
        return ResponseEntity.ok(voided);
    }

    @PostMapping("/{id}/unvoid")
    public ResponseEntity<Sale> unvoidSale(
            @PathVariable Long id,
            @RequestBody SaleService.UnvoidSaleRequest request) {
        Sale unvoided = saleService.unvoidSale(id, request);
        return ResponseEntity.ok(unvoided);
    }

    @PutMapping("/bill/{billGroupId}")
    public ResponseEntity<List<Sale>> replaceBill(
            @PathVariable String billGroupId,
            @RequestBody SaleService.CreateSaleRequest request) {
        List<Sale> updated = saleService.replaceBill(billGroupId, request);
        return ResponseEntity.ok(updated);
    }

    @PostMapping("/bill/{billGroupId}/finalize")
    public ResponseEntity<List<Sale>> finalizeDraft(
            @PathVariable String billGroupId,
            @RequestParam(defaultValue = "system") String finalizedBy) {
        List<Sale> finalized = saleService.finalizeDraft(billGroupId, finalizedBy);
        return ResponseEntity.ok(finalized);
    }

    @GetMapping("/check-duplicate")
    public ResponseEntity<Map<String, Boolean>> checkDuplicate(
            @RequestParam Long productId,
            @RequestParam String saleDate,
            @RequestParam Integer quantity,
            @RequestParam(required = false) String customerName) {
        boolean isDuplicate = saleService.isDuplicateRisk(productId, LocalDate.parse(saleDate), quantity, customerName);
        return ResponseEntity.ok(Map.of("isDuplicate", isDuplicate));
    }
}
