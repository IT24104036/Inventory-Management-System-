package invigo.invigo.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.persistence.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "sales")
public class Sale {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @ManyToOne
    @JoinColumn(name = "batch_id")
    private Batch batch;

    @Column(nullable = false)
    private Integer quantitySold;

    @Column(nullable = false)
    private LocalDate saleDate;

    @Column(nullable = false)
    private String recordedBy;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SaleStatus status = SaleStatus.ACTIVE;

    // Bill / POS grouping id (e.g. BILL-20260303-0001)
    @Column
    private String saleGroupId;

    @Column(length = 120)
    private String submissionKey;

    @Column(nullable = false)
    private Double unitPrice;

    @Column(nullable = false)
    private Double lineTotal;

    @Column
    private String notes;

    @Column
    private String customerName;

    @Column
    private String customerEmail;

    @Column
    private Double discountRate; // percentage e.g. 10.0 = 10%

    @Column
    private String lastEditedBy;

    // --- Audit fields ---
    @Column
    private String editReason;

    @Column
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime editedAt;

    @Column
    private String voidedBy;

    @Column
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime voidedAt;

    @Column
    private String voidReason;

    // --- Unvoid audit fields ---
    @Column
    private String unvoidedBy;

    @Column
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime unvoidedAt;

    @Column
    private String unvoidReason;

    @Column(nullable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime createdAt;

    @Column(nullable = false)
    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime updatedAt;

    public Sale() {
    }

    @PrePersist
    public void onCreate() {
        // Only auto-stamp if not explicitly set (e.g. replaceBill preserves original createdAt)
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Product getProduct() { return product; }
    public void setProduct(Product product) { this.product = product; }

    public Batch getBatch() { return batch; }
    public void setBatch(Batch batch) { this.batch = batch; }

    public Integer getQuantitySold() { return quantitySold; }
    public void setQuantitySold(Integer quantitySold) {
        this.quantitySold = quantitySold;
        if (this.unitPrice != null) {
            this.lineTotal = this.unitPrice * this.quantitySold;
        }
    }

    public LocalDate getSaleDate() { return saleDate; }
    public void setSaleDate(LocalDate saleDate) { this.saleDate = saleDate; }

    public String getRecordedBy() { return recordedBy; }
    public void setRecordedBy(String recordedBy) { this.recordedBy = recordedBy; }

    public SaleStatus getStatus() { return status; }
    public void setStatus(SaleStatus status) { this.status = status; }

    public String getSaleGroupId() { return saleGroupId; }
    public void setSaleGroupId(String saleGroupId) { this.saleGroupId = saleGroupId; }

    public String getSubmissionKey() { return submissionKey; }
    public void setSubmissionKey(String submissionKey) { this.submissionKey = submissionKey; }

    public Double getUnitPrice() { return unitPrice; }
    public void setUnitPrice(Double unitPrice) {
        this.unitPrice = unitPrice;
        if (this.quantitySold != null) {
            this.lineTotal = this.unitPrice * this.quantitySold;
        }
    }

    public Double getLineTotal() { return lineTotal; }
    public void setLineTotal(Double lineTotal) { this.lineTotal = lineTotal; }

    public String getNotes() { return notes; }
    public void setNotes(String notes) { this.notes = notes; }

    public String getCustomerName() { return customerName; }
    public void setCustomerName(String customerName) { this.customerName = customerName; }

    public String getCustomerEmail() { return customerEmail; }
    public void setCustomerEmail(String customerEmail) { this.customerEmail = customerEmail; }

    public Double getDiscountRate() { return discountRate; }
    public void setDiscountRate(Double discountRate) { this.discountRate = discountRate; }

    public String getLastEditedBy() { return lastEditedBy; }
    public void setLastEditedBy(String lastEditedBy) { this.lastEditedBy = lastEditedBy; }

    public String getEditReason() { return editReason; }
    public void setEditReason(String editReason) { this.editReason = editReason; }

    public LocalDateTime getEditedAt() { return editedAt; }
    public void setEditedAt(LocalDateTime editedAt) { this.editedAt = editedAt; }

    public String getVoidedBy() { return voidedBy; }
    public void setVoidedBy(String voidedBy) { this.voidedBy = voidedBy; }

    public LocalDateTime getVoidedAt() { return voidedAt; }
    public void setVoidedAt(LocalDateTime voidedAt) { this.voidedAt = voidedAt; }

    public String getVoidReason() { return voidReason; }
    public void setVoidReason(String voidReason) { this.voidReason = voidReason; }

    public String getUnvoidedBy() { return unvoidedBy; }
    public void setUnvoidedBy(String unvoidedBy) { this.unvoidedBy = unvoidedBy; }

    public LocalDateTime getUnvoidedAt() { return unvoidedAt; }
    public void setUnvoidedAt(LocalDateTime unvoidedAt) { this.unvoidedAt = unvoidedAt; }

    public String getUnvoidReason() { return unvoidReason; }
    public void setUnvoidReason(String unvoidReason) { this.unvoidReason = unvoidReason; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
