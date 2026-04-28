package invigo.invigo;

import invigo.invigo.entity.Batch;
import invigo.invigo.entity.Product;
import invigo.invigo.entity.WasteRecord;
import invigo.invigo.repository.BatchRepository;
import invigo.invigo.repository.ProductRepository;
import invigo.invigo.repository.WasteRecordRepository;
import invigo.invigo.service.AuthorizationService;
import invigo.invigo.service.BatchResolutionService;
import invigo.invigo.service.BatchService;
import invigo.invigo.service.StockAuditService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BatchServiceTest {

    @Mock
    private BatchRepository batchRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private WasteRecordRepository wasteRecordRepository;

    @Mock
    private BatchResolutionService batchResolutionService;

    @Mock
    private StockAuditService stockAuditService;

    @Mock
    private AuthorizationService authorizationService;

    @InjectMocks
    private BatchService batchService;

    @Test
    void recordWaste_acceptsExpiredDisposalAndReducesBatchQuantity() {
        Product product = new Product();
        product.setId(1L);
        product.setCostPrice(50.0);
        product.setName("Yogurt");

        Batch batch = new Batch();
        batch.setId(7L);
        batch.setProduct(product);
        batch.setQuantity(10);
        batch.setExpiryDate(LocalDate.now().minusDays(1));

        BatchService.RecordWasteRequest request = new BatchService.RecordWasteRequest();
        request.quantity = 4;
        request.reasonCode = "EXPIRED_DISPOSAL";
        request.notes = "Expired on shelf";

        when(batchRepository.findById(7L)).thenReturn(Optional.of(batch));
        when(batchRepository.save(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(batchResolutionService.refreshBatchStatus(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(authorizationService.getCurrentActorLabel()).thenReturn("warehouse-manager");
        when(wasteRecordRepository.save(any(WasteRecord.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = batchService.recordWaste(7L, request);

        assertEquals(6, ((Batch) response.get("batch")).getQuantity());
        @SuppressWarnings("unchecked")
        var waste = (java.util.Map<String, Object>) response.get("waste");
        assertEquals("EXPIRED_DISPOSAL", waste.get("reasonCode"));
        assertEquals(4, waste.get("quantityWasted"));
        verify(stockAuditService).record(batch, -4, "WASTE_RECORDED", "EXPIRED_DISPOSAL - Expired on shelf", "WASTE", null, "warehouse-manager");
    }

    @Test
    void recordWaste_rejectsUnknownReasonCode() {
        Product product = new Product();
        product.setId(1L);

        Batch batch = new Batch();
        batch.setId(8L);
        batch.setProduct(product);
        batch.setQuantity(3);
        batch.setExpiryDate(LocalDate.now().minusDays(2));

        BatchService.RecordWasteRequest request = new BatchService.RecordWasteRequest();
        request.quantity = 1;
        request.reasonCode = "EXPIRED";

        when(batchRepository.findById(8L)).thenReturn(Optional.of(batch));

        assertThrows(IllegalArgumentException.class, () -> batchService.recordWaste(8L, request));
    }

    @Test
    void addBatch_recordsCreationAudit() {
        Product product = new Product();
        product.setId(2L);
        product.setName("Cheese");

        BatchService.BatchRequest request = new BatchService.BatchRequest();
        request.productId = 2L;
        request.batchNumber = "C-22";
        request.quantity = 12;
        request.expiryDate = LocalDate.now().plusDays(20).toString();

        when(productRepository.findById(2L)).thenReturn(Optional.of(product));
        when(batchRepository.save(any(Batch.class))).thenAnswer(invocation -> {
            Batch saved = invocation.getArgument(0);
            saved.setId(20L);
            return saved;
        });
        when(batchResolutionService.refreshBatchStatus(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(authorizationService.getCurrentActorLabel()).thenReturn("stock-admin");

        Batch savedBatch = batchService.addBatch(request);
        assertEquals(12, savedBatch.getQuantity());
        verify(stockAuditService).record(savedBatch, 12, "BATCH_CREATED", "Batch created", "BATCH", "20", "stock-admin");
    }
}
