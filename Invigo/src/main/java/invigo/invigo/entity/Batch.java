package invigo.invigo.entity;

import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "batches")
public class Batch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false)
    private LocalDate expiryDate;

    private String batchNumber;

    private LocalDate addedDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, columnDefinition = "varchar(255) default 'ACTIVE'")
    private BatchResolutionStatus resolutionStatus = BatchResolutionStatus.ACTIVE;

    // ── AI Prediction result (persisted after each ML call) ───────────────────
    private String lastRiskLabel;

    private Double lastRiskProbability;

    private LocalDateTime lastPredictedAt;

    public Batch() {
    }

    public Batch(Product product, Integer quantity, LocalDate expiryDate) {
        this.product = product;
        this.quantity = quantity;
        this.expiryDate = expiryDate;
        this.addedDate = LocalDate.now();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Product getProduct() {
        return product;
    }

    public void setProduct(Product product) {
        this.product = product;
    }

    public Integer getQuantity() {
        return quantity;
    }

    public void setQuantity(Integer quantity) {
        this.quantity = quantity;
    }

    public LocalDate getExpiryDate() {
        return expiryDate;
    }

    public void setExpiryDate(LocalDate expiryDate) {
        this.expiryDate = expiryDate;
    }

    public String getBatchNumber() {
        return batchNumber;
    }

    public void setBatchNumber(String batchNumber) {
        this.batchNumber = batchNumber;
    }

    public LocalDate getAddedDate() {
        return addedDate;
    }

    public void setAddedDate(LocalDate addedDate) {
        this.addedDate = addedDate;
    }

    public BatchResolutionStatus getResolutionStatus() {
        return resolutionStatus;
    }

    public void setResolutionStatus(BatchResolutionStatus resolutionStatus) {
        this.resolutionStatus = resolutionStatus != null ? resolutionStatus : BatchResolutionStatus.ACTIVE;
    }

    public String getLastRiskLabel() {
        return lastRiskLabel;
    }

    public void setLastRiskLabel(String lastRiskLabel) {
        this.lastRiskLabel = lastRiskLabel;
    }

    public Double getLastRiskProbability() {
        return lastRiskProbability;
    }

    public void setLastRiskProbability(Double lastRiskProbability) {
        this.lastRiskProbability = lastRiskProbability;
    }

    public LocalDateTime getLastPredictedAt() {
        return lastPredictedAt;
    }

    public void setLastPredictedAt(LocalDateTime lastPredictedAt) {
        this.lastPredictedAt = lastPredictedAt;
    }

    /**
     * Risk-weighted stock value used for alert ordering.
     * Formula: probability of waste * units on hand * cost price.
     */
    @Transient
    public Double getImpactScore() {
        return computeImpactScore(lastRiskProbability);
    }

    public Double computeImpactScore(Double riskProbability) {
        if (riskProbability == null || quantity == null || quantity <= 0 || product == null) {
            return null;
        }
        Double costPrice = product.getCostPrice();
        if (costPrice == null || costPrice <= 0) {
            return null;
        }
        double value = riskProbability * quantity * costPrice;
        return Math.round(value * 100.0) / 100.0;
    }
}




