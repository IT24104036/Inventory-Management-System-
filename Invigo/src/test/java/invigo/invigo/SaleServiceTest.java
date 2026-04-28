package invigo.invigo;

import invigo.invigo.entity.Batch;
import invigo.invigo.entity.DiscountSuggestion;
import invigo.invigo.entity.Product;
import invigo.invigo.entity.Sale;
import invigo.invigo.entity.SaleStatus;
import invigo.invigo.repository.BatchRepository;
import invigo.invigo.repository.DiscountRepository;
import invigo.invigo.repository.ProductRepository;
import invigo.invigo.repository.SaleRepository;
import invigo.invigo.service.AuthorizationService;
import invigo.invigo.service.BatchResolutionService;
import invigo.invigo.service.EmailService;
import invigo.invigo.service.SaleService;
import invigo.invigo.service.StockAuditService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
public class SaleServiceTest {

    @Mock
    private ProductRepository productRepository;

    @Mock
    private BatchRepository batchRepository;

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private DiscountRepository discountRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private AuthorizationService authorizationService;

    @Mock
    private BatchResolutionService batchResolutionService;

    @Mock
    private StockAuditService stockAuditService;

    @InjectMocks
    private SaleService saleService;

    @Test
    public void testCreatePosSale_SplitsAcrossFefoBatchesAndAppliesBatchDiscounts() {
        Long productId = 1L;
        Product product = new Product();
        product.setId(productId);
        product.setName("Test Product");
        product.setSellingPrice(100.0);

        Batch batchOne = new Batch();
        batchOne.setId(101L);
        batchOne.setProduct(product);
        batchOne.setQuantity(1);
        batchOne.setExpiryDate(LocalDate.now().plusDays(1));

        Batch batchTwo = new Batch();
        batchTwo.setId(102L);
        batchTwo.setProduct(product);
        batchTwo.setQuantity(2);
        batchTwo.setExpiryDate(LocalDate.now().plusDays(2));

        DiscountSuggestion activeDiscount = new DiscountSuggestion();
        activeDiscount.setBatch(batchTwo);
        activeDiscount.setSuggestedRate(20.0);
        activeDiscount.setFinalRate(20.0);
        activeDiscount.setStatus("ACTIVE");

        SaleService.SaleItemRequest itemRequest = new SaleService.SaleItemRequest();
        itemRequest.productId = productId;
        itemRequest.quantity = 3;

        SaleService.CreateSaleRequest request = new SaleService.CreateSaleRequest();
        request.items = Collections.singletonList(itemRequest);
        request.saleDate = LocalDate.now();

        doNothing().when(authorizationService).requireSalesRecording();
        when(authorizationService.getCurrentUsername()).thenReturn("cashier01");
        when(productRepository.findById(productId)).thenReturn(Optional.of(product));
        when(productRepository.existsById(productId)).thenReturn(true);
        when(batchResolutionService.refreshBatchStatus(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(batchRepository.save(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(batchRepository.findByProductAndExpiryDateGreaterThanEqualOrderByExpiryDateAsc(eq(product), any()))
                .thenReturn(List.of(batchOne, batchTwo));
        when(discountRepository.findByBatch_IdAndStatus(batchOne.getId(), "ACTIVE")).thenReturn(Optional.empty());
        when(discountRepository.findByBatch_IdAndStatus(batchTwo.getId(), "ACTIVE")).thenReturn(Optional.of(activeDiscount));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertDoesNotThrow(() -> {
            List<Sale> result = saleService.createPosSale(request);
            assertNotNull(result);
            assertEquals(2, result.size());
            assertEquals(101L, result.get(0).getBatch().getId());
            assertEquals(1, result.get(0).getQuantitySold());
            assertEquals(100.0, result.get(0).getLineTotal());
            assertEquals(102L, result.get(1).getBatch().getId());
            assertEquals(2, result.get(1).getQuantitySold());
            assertEquals(80.0, result.get(1).getUnitPrice());
            assertEquals(160.0, result.get(1).getLineTotal());
            assertEquals("cashier01", result.get(0).getRecordedBy());
        });
        verify(stockAuditService).record(eq(batchOne), eq(-1), eq("SALE_RECORDED"), eq("Sale recorded"), eq("BILL"), any(), eq("cashier01"));
        verify(stockAuditService).record(eq(batchTwo), eq(-2), eq("SALE_RECORDED"), eq("Sale recorded"), eq("BILL"), any(), eq("cashier01"));
    }

    @Test
    public void testVoidAndUnvoidSale_RestoresAndRedeductsOriginalBatch() {
        Product product = new Product();
        product.setId(1L);
        product.setName("Milk");
        product.setSellingPrice(350.0);

        Batch batch = new Batch();
        batch.setId(55L);
        batch.setProduct(product);
        batch.setBatchNumber("B-55");
        batch.setQuantity(3);
        batch.setExpiryDate(LocalDate.now().plusDays(4));

        Sale sale = new Sale();
        sale.setId(7L);
        sale.setProduct(product);
        sale.setBatch(batch);
        sale.setQuantitySold(2);
        sale.setUnitPrice(350.0);
        sale.setStatus(SaleStatus.ACTIVE);
        sale.setRecordedBy("cashier01");
        sale.setCreatedAt(LocalDateTime.now().minusMinutes(20));

        SaleService.VoidSaleRequest voidRequest = new SaleService.VoidSaleRequest();
        voidRequest.voidReason = "Wrong bill";

        SaleService.UnvoidSaleRequest unvoidRequest = new SaleService.UnvoidSaleRequest();
        unvoidRequest.unvoidReason = "Restored after check";

        doNothing().when(authorizationService).requireSalesRecording();
        doNothing().when(authorizationService).requireSaleEditAccess(sale);
        doNothing().when(authorizationService).requireSaleUnvoidAccess();
        when(authorizationService.getCurrentUsername()).thenReturn("manager01");
        when(saleRepository.findById(7L)).thenReturn(Optional.of(sale));
        when(batchRepository.findById(55L)).thenReturn(Optional.of(batch));
        when(batchResolutionService.refreshBatchStatus(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(batchRepository.save(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Sale voided = saleService.voidSale(7L, voidRequest);
        assertEquals(SaleStatus.VOID, voided.getStatus());
        assertEquals(5, batch.getQuantity());
        assertEquals("manager01", voided.getVoidedBy());
        assertEquals(350.0, voided.getUnitPrice());
        verify(stockAuditService).record(batch, 2, "SALE_VOID", "Wrong bill", "SALE", "7", "manager01");

        Sale unvoided = saleService.unvoidSale(7L, unvoidRequest);
        assertEquals(SaleStatus.ACTIVE, unvoided.getStatus());
        assertEquals(3, batch.getQuantity());
        assertEquals("manager01", unvoided.getUnvoidedBy());
        assertEquals(350.0, unvoided.getUnitPrice());
        assertEquals(700.0, unvoided.getLineTotal());
        verify(stockAuditService).record(batch, -2, "SALE_UNVOID", "Restored after check", "SALE", "7", "manager01");
    }

    @Test
    public void testEditSaleQuantity_IncreaseKeepsDiscountedUnitPriceAndUpdatesLineTotal() {
        Product product = new Product();
        product.setId(1L);
        product.setName("Juice");
        product.setSellingPrice(100.0);

        Batch batch = new Batch();
        batch.setId(21L);
        batch.setProduct(product);
        batch.setBatchNumber("B-21");
        batch.setQuantity(5);
        batch.setExpiryDate(LocalDate.now().plusDays(6));

        Sale sale = new Sale();
        sale.setId(15L);
        sale.setProduct(product);
        sale.setBatch(batch);
        sale.setQuantitySold(2);
        sale.setUnitPrice(80.0);
        sale.setDiscountRate(20.0);
        sale.setStatus(SaleStatus.ACTIVE);

        SaleService.EditSaleRequest request = new SaleService.EditSaleRequest();
        request.newQuantity = 4;
        request.editReason = "Customer added two more";

        doNothing().when(authorizationService).requireSalesRecording();
        doNothing().when(authorizationService).requireSaleEditAccess(sale);
        when(authorizationService.getCurrentUsername()).thenReturn("cashier02");
        when(saleRepository.findById(15L)).thenReturn(Optional.of(sale));
        when(batchRepository.findById(21L)).thenReturn(Optional.of(batch));
        when(batchResolutionService.refreshBatchStatus(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(batchRepository.save(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        Sale updated = saleService.editSaleQuantity(15L, request);

        assertEquals(4, updated.getQuantitySold());
        assertEquals(80.0, updated.getUnitPrice());
        assertEquals(20.0, updated.getDiscountRate());
        assertEquals(320.0, updated.getLineTotal());
        assertEquals(3, batch.getQuantity());
        verify(stockAuditService).record(batch, -2, "SALE_EDIT_INCREASE", "Customer added two more", "SALE", "15", "cashier02");
    }

    @Test
    public void testEditSaleQuantity_DeniesUnauthorizedStaff() {
        Sale sale = new Sale();
        sale.setId(9L);
        sale.setStatus(SaleStatus.ACTIVE);

        SaleService.EditSaleRequest request = new SaleService.EditSaleRequest();
        request.newQuantity = 2;
        request.editReason = "Unauthorized";

        doNothing().when(authorizationService).requireSalesRecording();
        when(saleRepository.findById(9L)).thenReturn(Optional.of(sale));
        doThrow(new ResponseStatusException(HttpStatus.FORBIDDEN, "Denied"))
                .when(authorizationService).requireSaleEditAccess(sale);

        assertThrows(ResponseStatusException.class, () -> saleService.editSaleQuantity(9L, request));
        verifyNoInteractions(batchRepository);
    }

    @Test
    public void testCreatePosSale_ReturnsExistingSubmissionWhenClientRequestKeyRepeats() {
        Sale existing = new Sale();
        existing.setId(100L);
        existing.setSaleGroupId("BILL-1234");
        existing.setSubmissionKey("req-123");
        existing.setStatus(SaleStatus.ACTIVE);

        SaleService.CreateSaleRequest request = new SaleService.CreateSaleRequest();
        request.clientRequestKey = "req-123";
        request.saleDate = LocalDate.now();
        request.items = Collections.emptyList();

        doNothing().when(authorizationService).requireSalesRecording();
        when(saleRepository.findBySubmissionKey("req-123")).thenReturn(List.of(existing));

        List<Sale> result = saleService.createPosSale(request);

        assertEquals(1, result.size());
        assertEquals("BILL-1234", result.get(0).getSaleGroupId());
        verify(saleRepository, never()).save(any(Sale.class));
        verifyNoInteractions(productRepository, batchRepository, discountRepository);
    }

    @Test
    public void testFinalizeDraft_ActivatesDraftLinesDeductsStockAndQueuesEmail() {
        Product product = new Product();
        product.setId(1L);
        product.setName("Milk");
        product.setSellingPrice(350.0);

        Batch batch = new Batch();
        batch.setId(55L);
        batch.setProduct(product);
        batch.setBatchNumber("B-55");
        batch.setQuantity(5);
        batch.setExpiryDate(LocalDate.now().plusDays(4));

        Sale draft = new Sale();
        draft.setId(11L);
        draft.setProduct(product);
        draft.setBatch(batch);
        draft.setQuantitySold(2);
        draft.setUnitPrice(350.0);
        draft.setStatus(SaleStatus.DRAFT);
        draft.setSaleGroupId("BILL-9001");
        draft.setCustomerName("Nimal");
        draft.setCustomerEmail("nimal@example.com");

        doNothing().when(authorizationService).requireSalesRecording();
        doNothing().when(authorizationService).requireSaleEditAccess(draft);
        when(authorizationService.getCurrentUsername()).thenReturn("cashier01");
        when(saleRepository.findBySaleGroupIdAndStatus("BILL-9001", SaleStatus.DRAFT)).thenReturn(List.of(draft));
        when(batchRepository.findById(55L)).thenReturn(Optional.of(batch));
        when(batchResolutionService.refreshBatchStatus(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(batchRepository.save(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<Sale> result = saleService.finalizeDraft("BILL-9001", "cashier01");

        assertEquals(1, result.size());
        assertEquals(SaleStatus.ACTIVE, draft.getStatus());
        assertEquals(3, batch.getQuantity());
        verify(emailService).sendBillEmail(eq("nimal@example.com"), eq("Nimal"), eq("BILL-9001"), any(List.class), eq(draft.getLineTotal()));
        verify(stockAuditService).record(batch, -2, "DRAFT_FINALIZED", "Draft bill finalized", "BILL", "BILL-9001", "cashier01");
    }

    @Test
    public void testReplaceBill_VoidsOldLinesCreatesNewOnesAndPreservesCreatedAt() {
        Product product = new Product();
        product.setId(1L);
        product.setName("Yogurt");
        product.setSellingPrice(200.0);

        Batch existingBatch = new Batch();
        existingBatch.setId(10L);
        existingBatch.setProduct(product);
        existingBatch.setBatchNumber("B-10");
        existingBatch.setQuantity(0);
        existingBatch.setExpiryDate(LocalDate.now().plusDays(5));

        Batch replacementBatch = new Batch();
        replacementBatch.setId(12L);
        replacementBatch.setProduct(product);
        replacementBatch.setBatchNumber("B-12");
        replacementBatch.setQuantity(4);
        replacementBatch.setExpiryDate(LocalDate.now().plusDays(8));

        Sale existingSale = new Sale();
        existingSale.setId(1L);
        existingSale.setProduct(product);
        existingSale.setBatch(existingBatch);
        existingSale.setQuantitySold(2);
        existingSale.setUnitPrice(200.0);
        existingSale.setStatus(SaleStatus.ACTIVE);
        existingSale.setSaleGroupId("BILL-REPLACE");
        existingSale.setRecordedBy("cashier01");
        existingSale.setCreatedAt(LocalDateTime.now().minusMinutes(40));

        SaleService.SaleItemRequest itemRequest = new SaleService.SaleItemRequest();
        itemRequest.productId = 1L;
        itemRequest.quantity = 1;

        SaleService.CreateSaleRequest request = new SaleService.CreateSaleRequest();
        request.items = List.of(itemRequest);
        request.editReason = "Corrected quantity";
        request.customerName = "Kamal";
        request.customerEmail = "kamal@example.com";

        doNothing().when(authorizationService).requireSalesRecording();
        doNothing().when(authorizationService).requireSaleEditAccess(existingSale);
        when(authorizationService.getCurrentUsername()).thenReturn("manager01");
        when(saleRepository.findBySaleGroupId("BILL-REPLACE")).thenReturn(List.of(existingSale));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productRepository.existsById(1L)).thenReturn(true);
        when(batchRepository.findById(10L)).thenReturn(Optional.of(existingBatch));
        when(batchRepository.findByProductAndExpiryDateGreaterThanEqualOrderByExpiryDateAsc(eq(product), any()))
                .thenReturn(List.of(replacementBatch));
        when(discountRepository.findByBatch_IdAndStatus(12L, "ACTIVE")).thenReturn(Optional.empty());
        when(batchResolutionService.refreshBatchStatus(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(batchRepository.save(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<Sale> result = saleService.replaceBill("BILL-REPLACE", request);

        assertEquals(1, result.size());
        assertEquals(SaleStatus.VOID, existingSale.getStatus());
        assertEquals(1, result.get(0).getQuantitySold());
        assertEquals(existingSale.getCreatedAt(), result.get(0).getCreatedAt());
        assertEquals("manager01", result.get(0).getLastEditedBy());
        verify(emailService).sendBillEmail(eq("kamal@example.com"), eq("Kamal"), eq("BILL-REPLACE"), any(List.class), eq(result.get(0).getLineTotal()));
        verify(stockAuditService).record(existingBatch, 2, "BILL_REPLACE_VOID", "Bill replaced - Corrected quantity", "BILL", "BILL-REPLACE", "manager01");
        verify(stockAuditService).record(replacementBatch, -1, "BILL_REPLACED", "Corrected quantity", "BILL", "BILL-REPLACE", "manager01");
    }

    @Test
    public void testReplaceBill_RepricesReplacementLinesUsingActiveBatchDiscount() {
        Product product = new Product();
        product.setId(1L);
        product.setName("Yogurt");
        product.setSellingPrice(200.0);

        Batch existingBatch = new Batch();
        existingBatch.setId(10L);
        existingBatch.setProduct(product);
        existingBatch.setBatchNumber("B-10");
        existingBatch.setQuantity(0);
        existingBatch.setExpiryDate(LocalDate.now().plusDays(5));

        Batch replacementBatch = new Batch();
        replacementBatch.setId(12L);
        replacementBatch.setProduct(product);
        replacementBatch.setBatchNumber("B-12");
        replacementBatch.setQuantity(4);
        replacementBatch.setExpiryDate(LocalDate.now().plusDays(8));

        DiscountSuggestion activeDiscount = new DiscountSuggestion();
        activeDiscount.setBatch(replacementBatch);
        activeDiscount.setSuggestedRate(25.0);
        activeDiscount.setFinalRate(25.0);
        activeDiscount.setStatus("ACTIVE");

        Sale existingSale = new Sale();
        existingSale.setId(1L);
        existingSale.setProduct(product);
        existingSale.setBatch(existingBatch);
        existingSale.setQuantitySold(2);
        existingSale.setUnitPrice(200.0);
        existingSale.setStatus(SaleStatus.ACTIVE);
        existingSale.setSaleGroupId("BILL-DISCOUNT");
        existingSale.setRecordedBy("cashier01");
        existingSale.setCreatedAt(LocalDateTime.now().minusMinutes(40));

        SaleService.SaleItemRequest itemRequest = new SaleService.SaleItemRequest();
        itemRequest.productId = 1L;
        itemRequest.quantity = 2;

        SaleService.CreateSaleRequest request = new SaleService.CreateSaleRequest();
        request.items = List.of(itemRequest);
        request.editReason = "Adjusted with fresh discounted batch";

        doNothing().when(authorizationService).requireSalesRecording();
        doNothing().when(authorizationService).requireSaleEditAccess(existingSale);
        when(authorizationService.getCurrentUsername()).thenReturn("manager01");
        when(saleRepository.findBySaleGroupId("BILL-DISCOUNT")).thenReturn(List.of(existingSale));
        when(productRepository.findById(1L)).thenReturn(Optional.of(product));
        when(productRepository.existsById(1L)).thenReturn(true);
        when(batchRepository.findById(10L)).thenReturn(Optional.of(existingBatch));
        when(batchRepository.findByProductAndExpiryDateGreaterThanEqualOrderByExpiryDateAsc(eq(product), any()))
                .thenReturn(List.of(replacementBatch));
        when(discountRepository.findByBatch_IdAndStatus(12L, "ACTIVE")).thenReturn(Optional.of(activeDiscount));
        when(batchResolutionService.refreshBatchStatus(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(batchRepository.save(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(saleRepository.save(any(Sale.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<Sale> result = saleService.replaceBill("BILL-DISCOUNT", request);

        assertEquals(1, result.size());
        assertEquals(150.0, result.get(0).getUnitPrice());
        assertEquals(25.0, result.get(0).getDiscountRate());
        assertEquals(300.0, result.get(0).getLineTotal());
        verify(stockAuditService).record(replacementBatch, -2, "BILL_REPLACED", "Adjusted with fresh discounted batch", "BILL", "BILL-DISCOUNT", "manager01");
    }
}
