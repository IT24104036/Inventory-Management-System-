package invigo.invigo;

import invigo.invigo.controller.ReportsController;
import invigo.invigo.entity.Batch;
import invigo.invigo.entity.Product;
import invigo.invigo.entity.SaleStatus;
import invigo.invigo.entity.WasteRecord;
import invigo.invigo.repository.BatchRepository;
import invigo.invigo.repository.ProductRepository;
import invigo.invigo.repository.SaleRepository;
import invigo.invigo.repository.WasteRecordRepository;
import invigo.invigo.service.AuthorizationService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportsControllerTest {

    @Mock
    private BatchRepository batchRepository;

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private WasteRecordRepository wasteRecordRepository;

    @Mock
    private AuthorizationService authorizationService;

    @InjectMocks
    private ReportsController reportsController;

    @Test
    void summaryAndMonthlyLoss_keepExpiredShelfLossSeparateFromLoggedWaste() {
        Product product = new Product();
        product.setId(1L);
        product.setName("Milk");
        product.setCategory("Dairy");
        product.setCostPrice(100.0);

        Batch expiredBatch = new Batch();
        expiredBatch.setId(11L);
        expiredBatch.setProduct(product);
        expiredBatch.setQuantity(2);
        expiredBatch.setExpiryDate(LocalDate.now().minusDays(1));

        WasteRecord wasteRecord = new WasteRecord(expiredBatch, 1, "Logged", LocalDateTime.now(), "EXPIRED_DISPOSAL");

        doNothing().when(authorizationService).requireReportsView();
        when(batchRepository.findAll()).thenReturn(List.of(expiredBatch));
        when(batchRepository.findByExpiryDateBefore(LocalDate.now())).thenReturn(List.of(expiredBatch));
        when(batchRepository.findByExpiryDateBetween(LocalDate.now(), LocalDate.now().plusDays(7))).thenReturn(Collections.emptyList());
        when(saleRepository.findByStatus(SaleStatus.ACTIVE)).thenReturn(Collections.emptyList());
        when(productRepository.count()).thenReturn(1L);
        when(wasteRecordRepository.findAllWithBatchAndProduct()).thenReturn(List.of(wasteRecord));

        Map<String, Object> summary = reportsController.getSummary();
        assertEquals(200.0, summary.get("expiredOnShelfLoss"));
        assertEquals(100.0, summary.get("currentMonthWasteLoss"));

        List<Map<String, Object>> monthlyLoss = reportsController.getMonthlyLoss();
        Map<String, Object> currentMonth = monthlyLoss.get(monthlyLoss.size() - 1);
        assertEquals(100.0, currentMonth.get("loss"));
        assertEquals(1, currentMonth.get("units"));
    }
}
