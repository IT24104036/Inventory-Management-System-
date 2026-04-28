package invigo.invigo;

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
import invigo.invigo.service.BatchResolutionService;
import invigo.invigo.service.ExpiryRiskService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ExpiryRiskServiceTest {

    @Mock
    private BatchRepository batchRepository;

    @Mock
    private SaleRepository saleRepository;

    @Mock
    private WasteRecordRepository wasteRecordRepository;

    @Mock
    private BatchRiskPredictionRepository batchRiskPredictionRepository;

    @Mock
    private BatchResolutionService batchResolutionService;

    @Mock
    private RestTemplate restTemplate;

    private ExpiryRiskService expiryRiskService;

    @BeforeEach
    void setUp() {
        expiryRiskService = new ExpiryRiskService(
                batchRepository,
                saleRepository,
                wasteRecordRepository,
                batchRiskPredictionRepository,
                batchResolutionService,
                restTemplate
        );
        ReflectionTestUtils.setField(expiryRiskService, "mlApiBaseUrl", "http://ml.test");
        ReflectionTestUtils.setField(expiryRiskService, "riskThreshold", 0.65);
    }

    @Test
    void predictRisk_sanitizesInvalidManualInputBeforeCallingMlApi() {
        ExpiryRiskRequest request = new ExpiryRiskRequest();
        request.setDays_to_expiry_at_arrival(-5);
        request.setInitial_quantity(Double.NaN);
        request.setAverage_daily_sales(-1);
        request.setStock_pressure_ratio(Double.POSITIVE_INFINITY);
        request.setCategory("   ");
        request.setIs_weekend(7);
        request.setMonth(99);
        request.setDemand_variability(8.2);
        request.setSpoilage_sensitivity(-4.0);

        ExpiryRiskResponse mlResponse = new ExpiryRiskResponse();
        mlResponse.setRisk_label("Warning");
        mlResponse.setExpiry_risk_probability(0.42);

        when(restTemplate.exchange(
                eq("http://ml.test/predict"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(ExpiryRiskResponse.class)
        )).thenReturn(ResponseEntity.ok(mlResponse));

        ExpiryRiskResponse result = expiryRiskService.predictRisk(request);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<HttpEntity<ExpiryRiskRequest>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(
                eq("http://ml.test/predict"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(ExpiryRiskResponse.class)
        );

        ExpiryRiskRequest sent = entityCaptor.getValue().getBody();
        assertNotNull(sent);
        assertEquals(0.0, sent.getDays_to_expiry_at_arrival());
        assertEquals(0.0, sent.getInitial_quantity());
        assertEquals(0.0, sent.getAverage_daily_sales());
        assertEquals(0.0, sent.getStock_pressure_ratio());
        assertEquals("Other", sent.getCategory());
        assertEquals(0, sent.getIs_weekend());
        assertEquals(LocalDate.now().getMonthValue(), sent.getMonth());
        assertEquals(3.0, sent.getDemand_variability());
        assertEquals(0.0, sent.getSpoilage_sensitivity());
        assertEquals("Warning", result.getRisk_label());
    }

    @Test
    void predictFromBatch_derivesFeaturesSanitizesThemAndPersistsPrediction() {
        Product product = new Product();
        product.setId(1L);
        product.setCode("P-001");
        product.setName("Fresh Milk");
        product.setCategory(null);
        product.setCostPrice(250.0);
        product.setSellingPrice(300.0);
        product.setSpoilageSensitivity(2.5);

        Batch batch = new Batch();
        batch.setId(10L);
        batch.setProduct(product);
        batch.setQuantity(5);
        batch.setAddedDate(LocalDate.now().plusDays(2));
        batch.setExpiryDate(LocalDate.now().minusDays(1));

        Sale saleOne = new Sale();
        saleOne.setSaleDate(LocalDate.now().minusDays(1));
        saleOne.setQuantitySold(3);

        Sale saleTwo = new Sale();
        saleTwo.setSaleDate(LocalDate.now());
        saleTwo.setQuantitySold(1);

        ExpiryRiskResponse mlResponse = new ExpiryRiskResponse();
        mlResponse.setRisk_label("High Risk");
        mlResponse.setExpiry_risk_probability(0.5);

        when(batchRepository.findById(10L)).thenReturn(Optional.of(batch));
        when(saleRepository.findByProductAndStatus(product, SaleStatus.ACTIVE)).thenReturn(List.of(saleOne, saleTwo));
        when(restTemplate.exchange(
                eq("http://ml.test/predict"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(ExpiryRiskResponse.class)
        )).thenReturn(ResponseEntity.ok(mlResponse));
        when(batchRepository.save(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(batchResolutionService.refreshBatchStatus(any(Batch.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(batchRiskPredictionRepository.save(any(BatchRiskPrediction.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ExpiryRiskResponse result = expiryRiskService.predictFromBatch(10L);

        @SuppressWarnings("unchecked")
        ArgumentCaptor<HttpEntity<ExpiryRiskRequest>> entityCaptor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(
                eq("http://ml.test/predict"),
                eq(HttpMethod.POST),
                entityCaptor.capture(),
                eq(ExpiryRiskResponse.class)
        );

        ExpiryRiskRequest sent = entityCaptor.getValue().getBody();
        assertNotNull(sent);
        assertEquals(0.0, sent.getDays_to_expiry_at_arrival());
        assertEquals("Other", sent.getCategory());
        assertEquals(1.0, sent.getSpoilage_sensitivity());
        assertEquals(9.0, sent.getInitial_quantity());
        assertEquals(5.0, sent.getRemaining_quantity());
        assertEquals(4.0, sent.getUnits_sold());
        assertEquals(4.0, sent.getAverage_daily_sales());
        assertEquals(4.0, sent.getDaily_demand());
        assertEquals(1.25, sent.getStock_pressure_ratio());

        verify(batchRepository).save(batch);
        verify(batchRiskPredictionRepository).save(any(BatchRiskPrediction.class));
        assertEquals("High Risk", batch.getLastRiskLabel());
        assertEquals(0.5, batch.getLastRiskProbability());
        assertNotNull(batch.getLastPredictedAt());
        assertEquals(625.0, result.getImpact_score());
    }

    @Test
    void predictRisk_fallsBackToRuleBasedPredictionWhenMlApiIsUnavailable() {
        ExpiryRiskRequest request = new ExpiryRiskRequest();
        request.setDays_to_expiry_at_arrival(1);
        request.setInitial_quantity(25.0);
        request.setAverage_daily_sales(0.0);
        request.setStock_pressure_ratio(18.0);
        request.setCategory("Dairy");
        request.setIs_weekend(1);
        request.setMonth(4);
        request.setDemand_variability(2.1);
        request.setSpoilage_sensitivity(0.9);

        when(restTemplate.exchange(
                eq("http://ml.test/predict"),
                eq(HttpMethod.POST),
                any(HttpEntity.class),
                eq(ExpiryRiskResponse.class)
        )).thenThrow(new RuntimeException("ML offline"));

        ExpiryRiskResponse result = expiryRiskService.predictRisk(request);

        assertEquals("FALLBACK_RULE", result.getPrediction_source());
        assertEquals(0.65, result.getDecision_threshold());
        assertEquals(1, result.getPredicted_label());
        assertTrue(result.getExpiry_risk_probability() >= 0.65);
        assertEquals("High Risk", result.getRisk_label());
    }

    @Test
    void getValidationSummary_usesResolvedBatchesOnlyAndBuildsLiveMetrics() {
        Product product = new Product();
        product.setId(1L);
        product.setCode("P-001");
        product.setName("Fresh Milk");
        product.setCostPrice(100.0);
        product.setSellingPrice(120.0);

        Batch wastedBatch = new Batch();
        wastedBatch.setId(1L);
        wastedBatch.setProduct(product);
        wastedBatch.setBatchNumber("B-1");
        wastedBatch.setExpiryDate(LocalDate.now().minusDays(2));
        wastedBatch.setQuantity(4);
        wastedBatch.setLastRiskProbability(0.82);
        wastedBatch.setLastRiskLabel("High Risk");
        wastedBatch.setLastPredictedAt(LocalDateTime.now().minusDays(3));

        Batch safeBatch = new Batch();
        safeBatch.setId(2L);
        safeBatch.setProduct(product);
        safeBatch.setBatchNumber("B-2");
        safeBatch.setExpiryDate(LocalDate.now().minusDays(1));
        safeBatch.setQuantity(0);
        safeBatch.setLastRiskProbability(0.18);
        safeBatch.setLastRiskLabel("Low Risk");
        safeBatch.setLastPredictedAt(LocalDateTime.now().minusDays(2));

        Batch unresolvedBatch = new Batch();
        unresolvedBatch.setId(3L);
        unresolvedBatch.setProduct(product);
        unresolvedBatch.setBatchNumber("B-3");
        unresolvedBatch.setExpiryDate(LocalDate.now().minusDays(1));
        unresolvedBatch.setQuantity(5);
        unresolvedBatch.setLastRiskProbability(0.64);
        unresolvedBatch.setLastRiskLabel("Warning");
        unresolvedBatch.setLastPredictedAt(LocalDateTime.now().minusDays(2));

        Batch noPredictionBatch = new Batch();
        noPredictionBatch.setId(4L);
        noPredictionBatch.setProduct(product);
        noPredictionBatch.setBatchNumber("B-4");
        noPredictionBatch.setExpiryDate(LocalDate.now().minusDays(1));
        noPredictionBatch.setQuantity(0);

        WasteRecord wasteRecord = new WasteRecord();
        wasteRecord.setBatch(wastedBatch);
        wasteRecord.setQuantityWasted(4);
        wasteRecord.setRecordedAt(LocalDateTime.now().minusDays(1));

        when(batchRepository.findAll()).thenReturn(List.of(wastedBatch, safeBatch, unresolvedBatch, noPredictionBatch));
        when(wasteRecordRepository.findAll()).thenReturn(List.of(wasteRecord));
        when(batchResolutionService.determineStatus(wastedBatch)).thenReturn(BatchResolutionStatus.WASTED);
        when(batchResolutionService.determineStatus(safeBatch)).thenReturn(BatchResolutionStatus.SOLD_OUT);
        when(batchResolutionService.determineStatus(unresolvedBatch)).thenReturn(BatchResolutionStatus.ACTIVE);

        Map<String, Object> result = expiryRiskService.getValidationSummary();

        assertEquals(2, result.get("evaluatedBatchCount"));
        assertEquals(1, result.get("unresolvedBatchCount"));
        assertEquals(1, result.get("batchesWithoutPrediction"));
        assertEquals(0.65, result.get("threshold"));
        assertEquals(1.0, result.get("accuracy"));
        assertEquals(1.0, result.get("precision"));
        assertEquals(1.0, result.get("recall"));
        assertEquals(1.0, result.get("f1Score"));
        assertEquals("Live validation looks reasonably healthy on resolved batches.", result.get("interpretation"));
    }

    @Test
    void getValidationTrend_groupsLatestPredictionPerBatchPerMonth() {
        Product product = new Product();
        product.setId(1L);
        product.setCode("P-001");
        product.setName("Fresh Milk");

        Batch batch = new Batch();
        batch.setId(10L);
        batch.setProduct(product);
        batch.setBatchNumber("B-10");
        batch.setQuantity(0);
        batch.setExpiryDate(LocalDate.of(2026, 4, 20));

        BatchRiskPrediction earlyPrediction = new BatchRiskPrediction();
        earlyPrediction.setBatch(batch);
        earlyPrediction.setRiskLabel("Low Risk");
        earlyPrediction.setRiskProbability(0.22);
        earlyPrediction.setPredictedAt(LocalDateTime.of(2026, 4, 5, 9, 0));

        BatchRiskPrediction latestPrediction = new BatchRiskPrediction();
        latestPrediction.setBatch(batch);
        latestPrediction.setRiskLabel("High Risk");
        latestPrediction.setRiskProbability(0.88);
        latestPrediction.setPredictedAt(LocalDateTime.of(2026, 4, 18, 9, 0));

        WasteRecord wasteRecord = new WasteRecord();
        wasteRecord.setBatch(batch);
        wasteRecord.setQuantityWasted(3);
        wasteRecord.setRecordedAt(LocalDateTime.of(2026, 4, 21, 10, 0));

        when(batchRiskPredictionRepository.findAllWithBatchAndProduct())
                .thenReturn(List.of(earlyPrediction, latestPrediction));
        when(wasteRecordRepository.findAll()).thenReturn(List.of(wasteRecord));
        when(batchResolutionService.determineStatus(batch)).thenReturn(BatchResolutionStatus.WASTED);

        List<Map<String, Object>> trend = expiryRiskService.getValidationTrend();

        assertEquals(1, trend.size());
        Map<String, Object> april = trend.get(0);
        assertEquals("2026-04", april.get("month"));
        assertEquals(1, april.get("evaluatedBatchCount"));
        assertEquals(1.0, april.get("precision"));
        assertEquals(1.0, april.get("recall"));
        assertEquals(1.0, april.get("f1Score"));
    }

    @Test
    void getValidationTrend_usesConfiguredThresholdInsteadOfHardcodedHalf() {
        Product product = new Product();
        product.setId(2L);
        product.setCode("P-002");
        product.setName("Yogurt");

        Batch batch = new Batch();
        batch.setId(11L);
        batch.setProduct(product);
        batch.setBatchNumber("B-11");
        batch.setQuantity(0);
        batch.setExpiryDate(LocalDate.of(2026, 4, 18));

        BatchRiskPrediction prediction = new BatchRiskPrediction();
        prediction.setBatch(batch);
        prediction.setRiskLabel("Warning");
        prediction.setRiskProbability(0.6);
        prediction.setPredictedAt(LocalDateTime.of(2026, 4, 18, 9, 0));

        WasteRecord wasteRecord = new WasteRecord();
        wasteRecord.setBatch(batch);
        wasteRecord.setQuantityWasted(2);
        wasteRecord.setRecordedAt(LocalDateTime.of(2026, 4, 19, 10, 0));

        when(batchRiskPredictionRepository.findAllWithBatchAndProduct()).thenReturn(List.of(prediction));
        when(wasteRecordRepository.findAll()).thenReturn(List.of(wasteRecord));
        when(batchResolutionService.determineStatus(batch)).thenReturn(BatchResolutionStatus.WASTED);

        List<Map<String, Object>> trend = expiryRiskService.getValidationTrend();

        assertEquals(1, trend.size());
        Map<String, Object> april = trend.get(0);
        assertEquals(1, april.get("evaluatedBatchCount"));
        assertEquals(0.0, april.get("precision"));
        assertEquals(0.0, april.get("recall"));
        assertEquals(0.0, april.get("f1Score"));
        assertEquals(0, april.get("truePositive"));
        assertEquals(0, april.get("falsePositive"));
        assertEquals(0, april.get("trueNegative"));
        assertEquals(1, april.get("falseNegative"));
    }
}
