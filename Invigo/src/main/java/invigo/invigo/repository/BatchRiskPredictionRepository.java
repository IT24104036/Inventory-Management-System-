package invigo.invigo.repository;

import invigo.invigo.entity.BatchRiskPrediction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BatchRiskPredictionRepository extends JpaRepository<BatchRiskPrediction, Long> {

    @Query("SELECT p FROM BatchRiskPrediction p JOIN FETCH p.batch b JOIN FETCH b.product ORDER BY p.predictedAt DESC")
    List<BatchRiskPrediction> findAllWithBatchAndProduct();

    @Modifying
    @Query("DELETE FROM BatchRiskPrediction p WHERE p.batch.id = :batchId")
    int deleteByBatchId(@Param("batchId") Long batchId);
}
