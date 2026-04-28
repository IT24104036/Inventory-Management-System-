package invigo.invigo.repository;

import invigo.invigo.entity.Sale;
import invigo.invigo.entity.SaleStatus;
import invigo.invigo.entity.Batch;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    List<Sale> findBySaleDateBetween(LocalDate start, LocalDate end);

    List<Sale> findBySaleGroupId(String saleGroupId);

    List<Sale> findBySubmissionKey(String submissionKey);

    List<Sale> findByStatus(SaleStatus status);

    List<Sale> findBySaleGroupIdAndStatus(String saleGroupId, SaleStatus status);

    List<Sale> findByProductIdAndSaleDateAndStatus(Long productId, LocalDate saleDate, SaleStatus status);

    List<Sale> findByProductIdAndSaleDateAndQuantitySoldAndCustomerNameAndStatus(
            Long productId, LocalDate saleDate, Integer quantitySold, String customerName, SaleStatus status);

    List<Sale> findByProductIdAndSaleDateAndQuantitySoldAndCustomerNameIsNullAndStatus(
            Long productId, LocalDate saleDate, Integer quantitySold, SaleStatus status);

    List<Sale> findByProductAndSaleDateBetweenAndStatus(
            invigo.invigo.entity.Product product, LocalDate start, LocalDate end, SaleStatus status);

    List<Sale> findByProductAndStatus(invigo.invigo.entity.Product product, SaleStatus status);

    List<Sale> findByBatchAndStatus(Batch batch, SaleStatus status);

    @Modifying
    @Query("UPDATE Sale s SET s.batch = null WHERE s.batch.id = :batchId")
    int clearBatchReference(@Param("batchId") Long batchId);
}
