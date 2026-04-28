package invigo.invigo.repository;

import invigo.invigo.entity.DiscountSuggestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface DiscountRepository extends JpaRepository<DiscountSuggestion, Long> {

    List<DiscountSuggestion> findByStatus(String status);

    List<DiscountSuggestion> findByProductIdAndStatus(Long productId, String status);

    Optional<DiscountSuggestion> findByBatch_Id(Long batchId);

    Optional<DiscountSuggestion> findByBatch_IdAndStatus(Long batchId, String status);

    boolean existsByBatch_Id(Long batchId);

    @Modifying
    @Query("DELETE FROM DiscountSuggestion d WHERE d.batch.id = :batchId")
    int deleteByBatchId(@Param("batchId") Long batchId);
}
