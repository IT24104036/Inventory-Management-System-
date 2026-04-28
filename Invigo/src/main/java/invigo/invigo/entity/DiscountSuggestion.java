package invigo.invigo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "discount_suggestions")
public class DiscountSuggestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne(optional = false)
    @JoinColumn(name = "batch_id", nullable = false)
    private Batch batch;

    /** Suggested discount rate in percent (e.g. 20.0 = 20%) */
    @Column(nullable = false)
    private Double suggestedRate;

    /** Admin-overridden final rate; null until admin acts */
    private Double finalRate;

    /** PENDING | ACTIVE | REJECTED | INACTIVE */
    @Column(nullable = false)
    private String status = "PENDING";

    @Column(nullable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
    private String reviewRequestedBy;
    private LocalDateTime reviewRequestedAt;

    @PrePersist
    public void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public DiscountSuggestion() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public Batch getBatch() { return batch; }
    public void setBatch(Batch batch) { this.batch = batch; }

    public Double getSuggestedRate() { return suggestedRate; }
    public void setSuggestedRate(Double suggestedRate) { this.suggestedRate = suggestedRate; }

    public Double getFinalRate() { return finalRate; }
    public void setFinalRate(Double finalRate) { this.finalRate = finalRate; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public LocalDateTime getUpdatedAt() { return updatedAt; }

    public String getReviewRequestedBy() { return reviewRequestedBy; }
    public void setReviewRequestedBy(String reviewRequestedBy) { this.reviewRequestedBy = reviewRequestedBy; }

    public LocalDateTime getReviewRequestedAt() { return reviewRequestedAt; }
    public void setReviewRequestedAt(LocalDateTime reviewRequestedAt) { this.reviewRequestedAt = reviewRequestedAt; }
}
