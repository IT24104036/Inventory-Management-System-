package invigo.invigo.repository;

import invigo.invigo.entity.Batch;
import invigo.invigo.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface BatchRepository extends JpaRepository<Batch, Long> {

    List<Batch> findByProductAndExpiryDateGreaterThanEqualOrderByExpiryDateAsc(Product product, LocalDate date);

    List<Batch> findByProductOrderByExpiryDateDesc(Product product);

    // For reports & discounts
    List<Batch> findByExpiryDateBefore(LocalDate date);

    List<Batch> findByExpiryDateBetween(LocalDate start, LocalDate end);

    List<Batch> findByExpiryDateGreaterThanEqual(LocalDate date);

    // Improvement #19: filter at DB level — only load batches with remaining stock.
    // Previously the code called findAll() and then skipped quantity<=0 in Java.
    // This method pushes that filter into the SQL WHERE clause, saving memory.
    List<Batch> findByQuantityGreaterThan(int quantity);
}





