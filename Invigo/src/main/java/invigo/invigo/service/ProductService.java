package invigo.invigo.service;

import invigo.invigo.entity.Batch;
import invigo.invigo.entity.Product;
import invigo.invigo.repository.BatchRepository;
import invigo.invigo.repository.ProductRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
public class ProductService {

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private BatchRepository batchRepository;

    public List<Product> getAllProducts() {
        return productRepository.findAll();
    }

    public Product createProduct(Product product) {
        // Auto-generate a unique SKU code if not provided
        if (product.getCode() == null || product.getCode().isBlank()) {
            product.setCode("PRD-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        }
        return productRepository.save(product);
    }

    public Product updateProduct(Long id, Product updates) {
        Product existing = productRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Product not found: " + id));
        existing.setName(updates.getName());
        existing.setCategory(updates.getCategory());
        existing.setSupplier(updates.getSupplier());
        existing.setCostPrice(updates.getCostPrice());
        existing.setSellingPrice(updates.getSellingPrice());
        return productRepository.save(existing);
    }

    public void deleteProduct(Long id) {
        if (!productRepository.existsById(id)) {
            throw new IllegalArgumentException("Product not found: " + id);
        }
        productRepository.deleteById(id);
    }

    /**
     * Total available quantity for a product across all non-expired batches.
     */
    public int getAvailableQuantity(Long productId) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new IllegalArgumentException("Product not found"));

        List<Batch> batches = batchRepository
                .findByProductAndExpiryDateGreaterThanEqualOrderByExpiryDateAsc(product, LocalDate.now());

        return batches.stream()
                .mapToInt(Batch::getQuantity)
                .sum();
    }
}




