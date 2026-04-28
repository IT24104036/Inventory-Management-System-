package invigo.invigo.service;

import invigo.invigo.entity.DiscountSuggestion;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Runs the full prevention loop automatically:
 * live inventory/sales -> ML expiry risk -> discount suggestions.
 */
@Service
public class ScheduledRiskService {

    private static final Logger log = LoggerFactory.getLogger(ScheduledRiskService.class);

    private final ExpiryRiskService expiryRiskService;
    private final DiscountService discountService;
    private final boolean autoScanEnabled;
    private final AtomicBoolean running = new AtomicBoolean(false);

    public ScheduledRiskService(ExpiryRiskService expiryRiskService,
                                DiscountService discountService,
                                @Value("${ml.auto-scan.enabled:true}") boolean autoScanEnabled) {
        this.expiryRiskService = expiryRiskService;
        this.discountService = discountService;
        this.autoScanEnabled = autoScanEnabled;
    }

    @Scheduled(
            fixedDelayString = "${ml.auto-scan.fixed-delay-ms:300000}",
            initialDelayString = "${ml.auto-scan.initial-delay-ms:60000}"
    )
    public void runAutomaticRiskAndSuggestionScan() {
        if (!autoScanEnabled) {
            return;
        }
        if (!running.compareAndSet(false, true)) {
            log.info("[ScheduledRiskService] Previous AI prevention scan still running; skipping this tick.");
            return;
        }

        log.info("[ScheduledRiskService] Starting automatic AI risk scan and discount suggestion refresh...");
        try {
            Map<String, Object> riskResult = expiryRiskService.predictAllBatches();
            List<DiscountSuggestion> suggestions = discountService.generateSuggestions();
            log.info(
                    "[ScheduledRiskService] Automatic prevention scan complete. riskResult={}, suggestionsGeneratedOrRefreshed={}",
                    riskResult,
                    suggestions.size()
            );
        } catch (Exception e) {
            log.error("[ScheduledRiskService] Automatic prevention scan failed: {}", e.getMessage(), e);
        } finally {
            running.set(false);
        }
    }
}
