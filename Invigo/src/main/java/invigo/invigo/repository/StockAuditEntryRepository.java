package invigo.invigo.repository;

import invigo.invigo.entity.StockAuditEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface StockAuditEntryRepository extends JpaRepository<StockAuditEntry, Long> {

    @Query("""
            SELECT e
            FROM StockAuditEntry e
            LEFT JOIN FETCH e.batch b
            LEFT JOIN FETCH e.product p
            ORDER BY e.recordedAt DESC, e.id DESC
            """)
    List<StockAuditEntry> findAllWithBatchAndProduct();

    @Modifying
    @Query("UPDATE StockAuditEntry e SET e.batch = null WHERE e.batch.id = :batchId")
    int clearBatchReference(@Param("batchId") Long batchId);
}
