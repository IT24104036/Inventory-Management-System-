package invigo.invigo.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "waste_records")
public class WasteRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "batch_id", nullable = false)
    @JsonIgnore
    private Batch batch;

    @Column(nullable = false)
    private Integer quantityWasted;

    @Column(length = 500)
    private String notes;

    /**
     * Why stock was written off: SPOILAGE, DAMAGE, RECALL, EXPIRED_DISPOSAL, OTHER.
     * Nullable for legacy rows created before reason codes existed.
     */
    @Column(length = 40)
    private String reasonCode;

    @Column(nullable = false)
    private LocalDateTime recordedAt;

    public WasteRecord() {
    }

    public WasteRecord(Batch batch, Integer quantityWasted, String notes, LocalDateTime recordedAt) {
        this(batch, quantityWasted, notes, recordedAt, null);
    }

    public WasteRecord(Batch batch, Integer quantityWasted, String notes, LocalDateTime recordedAt, String reasonCode) {
        this.batch = batch;
        this.quantityWasted = quantityWasted;
        this.notes = notes;
        this.recordedAt = recordedAt;
        this.reasonCode = reasonCode;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Batch getBatch() {
        return batch;
    }

    public void setBatch(Batch batch) {
        this.batch = batch;
    }

    public Integer getQuantityWasted() {
        return quantityWasted;
    }

    public void setQuantityWasted(Integer quantityWasted) {
        this.quantityWasted = quantityWasted;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public LocalDateTime getRecordedAt() {
        return recordedAt;
    }

    public void setRecordedAt(LocalDateTime recordedAt) {
        this.recordedAt = recordedAt;
    }

    public String getReasonCode() {
        return reasonCode;
    }

    public void setReasonCode(String reasonCode) {
        this.reasonCode = reasonCode;
    }
}
