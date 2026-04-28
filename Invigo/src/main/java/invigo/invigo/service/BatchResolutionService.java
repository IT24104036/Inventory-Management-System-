package invigo.invigo.service;

import invigo.invigo.entity.Batch;
import invigo.invigo.entity.BatchResolutionStatus;
import invigo.invigo.repository.BatchRepository;
import invigo.invigo.repository.WasteRecordRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.Collection;

@Service
public class BatchResolutionService {

    private final BatchRepository batchRepository;
    private final WasteRecordRepository wasteRecordRepository;

    public BatchResolutionService(BatchRepository batchRepository, WasteRecordRepository wasteRecordRepository) {
        this.batchRepository = batchRepository;
        this.wasteRecordRepository = wasteRecordRepository;
    }

    public Batch refreshBatchStatus(Batch batch) {
        if (batch == null) {
            return null;
        }
        batch.setResolutionStatus(determineStatus(batch));
        return batchRepository.save(batch);
    }

    public void refreshBatchStatuses(Collection<Batch> batches) {
        if (batches == null) {
            return;
        }
        for (Batch batch : batches) {
            if (batch != null) {
                batch.setResolutionStatus(determineStatus(batch));
            }
        }
        batchRepository.saveAll(batches);
    }

    public BatchResolutionStatus determineStatus(Batch batch) {
        if (batch == null) {
            return BatchResolutionStatus.ACTIVE;
        }

        int currentQuantity = batch.getQuantity() != null ? batch.getQuantity() : 0;
        boolean expired = batch.getExpiryDate() != null && !batch.getExpiryDate().isAfter(LocalDate.now());
        Integer wastedQuantity = batch.getId() != null
                ? wasteRecordRepository.sumQuantityWastedByBatchId(batch.getId())
                : 0;
        boolean hadWaste = wastedQuantity != null && wastedQuantity > 0;

        if (hadWaste && currentQuantity <= 0) {
            return BatchResolutionStatus.WASTED;
        }
        if (currentQuantity <= 0) {
            return BatchResolutionStatus.SOLD_OUT;
        }
        if (expired) {
            return BatchResolutionStatus.EXPIRED_ON_SHELF;
        }
        return BatchResolutionStatus.ACTIVE;
    }
}
