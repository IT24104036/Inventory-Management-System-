package invigo.invigo.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "products")
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Optional code / SKU if you want to show in UI later
    @Column(nullable = false, unique = true)
    private String code;

    @Column(nullable = false)
    private String name;

    private String category;
    
    private String supplier;

    @Column(nullable = false)
    private Double costPrice;

    @Column(nullable = false)
    private Double sellingPrice;

    /**
     * How physically sensitive this product is to storage conditions and handling.
     * Range 0.0 (shelf-stable) to 1.0 (extremely perishable).
     * Used as a feature in the expiry-risk ML model.
     * Nullable in DB so Hibernate can add the column on existing SQL Server rows; treat null as 0.5 in getters.
     */
    @Column
    private Double spoilageSensitivity;

    public Product() {
    }

    public Product(String code, String name, String category, String supplier, Double costPrice, Double sellingPrice) {
        this.code = code;
        this.name = name;
        this.category = category;
        this.supplier = supplier;
        this.costPrice = costPrice;
        this.sellingPrice = sellingPrice;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getCode() {
        return code;
    }

    public void setCode(String code) {
        this.code = code;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getCategory() {
        return category;
    }

    public void setCategory(String category) {
        this.category = category;
    }

    public String getSupplier() {
        return supplier;
    }

    public void setSupplier(String supplier) {
        this.supplier = supplier;
    }

    public Double getCostPrice() {
        return costPrice;
    }

    public void setCostPrice(Double costPrice) {
        this.costPrice = costPrice;
    }

    public Double getSellingPrice() {
        return sellingPrice;
    }

    public void setSellingPrice(Double sellingPrice) {
        this.sellingPrice = sellingPrice;
    }

    public Double getSpoilageSensitivity() {
        return spoilageSensitivity != null ? spoilageSensitivity : 0.5;
    }

    public void setSpoilageSensitivity(Double spoilageSensitivity) {
        this.spoilageSensitivity = spoilageSensitivity != null ? spoilageSensitivity : 0.5;
    }
}




