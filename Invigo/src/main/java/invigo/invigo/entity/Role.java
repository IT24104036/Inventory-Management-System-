package invigo.invigo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "roles")
public class Role {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String roleName;

    @Column
    private String description;

    @Column(nullable = false)
    private String roleType = "STAFF"; // "STAFF" or "ADMIN"

    @Column
    private int usersAssigned = 0;

    @Column
    private LocalDateTime lastModified;

    // --- Permission flags (tick = full CRUD, no tick = read-only) ---
    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean inventoryExpiry = false;

    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean inventoryTracking = false;

    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean productManagement = false;

    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean salesManagement = false;

    @Column(name = "discount_alerts", nullable = false, columnDefinition = "bit default 0")
    private boolean discountsAlerts = false;

    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean reportAnalytics = false;

    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean reportsDashboard = false;

    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean userControl = false;

    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean addUpdateStock = false;

    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean salesRecording = false;

    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean userManagement = false;

    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean editVoidSales = false;

    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean viewProductPrices = false;

    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean editDiscounts = false;

    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean editProducts = false;

    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean editReports = false;

    // Default constructor for JPA
    public Role() {
        this.lastModified = LocalDateTime.now();
    }

    public Role(String roleName, String description) {
        this.roleName = roleName;
        this.description = description;
        this.lastModified = LocalDateTime.now();
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getRoleType() { return roleType; }
    public void setRoleType(String roleType) { this.roleType = roleType != null ? roleType.toUpperCase() : "STAFF"; }

    public int getUsersAssigned() { return usersAssigned; }
    public void setUsersAssigned(int usersAssigned) { this.usersAssigned = usersAssigned; }

    public LocalDateTime getLastModified() { return lastModified; }
    public void setLastModified(LocalDateTime lastModified) { this.lastModified = lastModified; }

    public boolean isInventoryExpiry() { return inventoryExpiry; }
    public void setInventoryExpiry(boolean inventoryExpiry) { this.inventoryExpiry = inventoryExpiry; }

    public boolean isInventoryTracking() { return inventoryTracking; }
    public void setInventoryTracking(boolean inventoryTracking) { this.inventoryTracking = inventoryTracking; }

    public boolean isProductManagement() { return productManagement; }
    public void setProductManagement(boolean productManagement) { this.productManagement = productManagement; }

    public boolean isSalesManagement() { return salesManagement; }
    public void setSalesManagement(boolean salesManagement) { this.salesManagement = salesManagement; }

    public boolean isDiscountsAlerts() { return discountsAlerts; }
    public void setDiscountsAlerts(boolean discountsAlerts) { this.discountsAlerts = discountsAlerts; }

    public boolean isReportAnalytics() { return reportAnalytics; }
    public void setReportAnalytics(boolean reportAnalytics) { this.reportAnalytics = reportAnalytics; }

    public boolean isReportsDashboard() { return reportsDashboard; }
    public void setReportsDashboard(boolean reportsDashboard) { this.reportsDashboard = reportsDashboard; }

    public boolean isUserControl() { return userControl; }
    public void setUserControl(boolean userControl) { this.userControl = userControl; }

    public boolean isAddUpdateStock() { return addUpdateStock; }
    public void setAddUpdateStock(boolean addUpdateStock) { this.addUpdateStock = addUpdateStock; }

    public boolean isSalesRecording() { return salesRecording; }
    public void setSalesRecording(boolean salesRecording) { this.salesRecording = salesRecording; }

    public boolean isUserManagement() { return userManagement; }
    public void setUserManagement(boolean userManagement) { this.userManagement = userManagement; }

    public boolean isEditVoidSales() { return editVoidSales; }
    public void setEditVoidSales(boolean editVoidSales) { this.editVoidSales = editVoidSales; }

    public boolean isViewProductPrices() { return viewProductPrices; }
    public void setViewProductPrices(boolean viewProductPrices) { this.viewProductPrices = viewProductPrices; }

    public boolean isEditDiscounts() { return editDiscounts; }
    public void setEditDiscounts(boolean editDiscounts) { this.editDiscounts = editDiscounts; }

    public boolean isEditProducts() { return editProducts; }
    public void setEditProducts(boolean editProducts) { this.editProducts = editProducts; }

    public boolean isEditReports() { return editReports; }
    public void setEditReports(boolean editReports) { this.editReports = editReports; }
}
