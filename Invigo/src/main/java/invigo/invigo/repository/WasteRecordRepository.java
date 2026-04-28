package invigo.invigo.repository;

import invigo.invigo.entity.WasteRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface WasteRecordRepository extends JpaRepository<WasteRecord, Long> {

    @Query("SELECT w FROM WasteRecord w JOIN FETCH w.batch b JOIN FETCH b.product ORDER BY w.recordedAt DESC")
    List<WasteRecord> findAllWithBatchAndProduct();

    @Query("SELECT w FROM WasteRecord w JOIN FETCH w.batch b JOIN FETCH b.product " +
           "WHERE w.recordedAt >= :from AND w.recordedAt <= :to ORDER BY w.recordedAt DESC")
    List<WasteRecord> findByDateRange(LocalDateTime from, LocalDateTime to);

    @Query("SELECT DISTINCT b.id FROM WasteRecord w JOIN w.batch b")
    List<Long> findDistinctBatchIdsWithWaste();

    @Query("SELECT COALESCE(SUM(w.quantityWasted), 0) FROM WasteRecord w WHERE w.batch.id = :batchId")
    Integer sumQuantityWastedByBatchId(Long batchId);

    @Modifying
    @Query("DELETE FROM WasteRecord w WHERE w.batch.id = :batchId")
    int deleteByBatchId(@Param("batchId") Long batchId);
}
