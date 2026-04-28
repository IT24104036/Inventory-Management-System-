package invigo.invigo.service;

import invigo.invigo.entity.Role;
import invigo.invigo.entity.Sale;
import invigo.invigo.entity.User;
import invigo.invigo.entity.UserRole;
import invigo.invigo.repository.RoleRepository;
import invigo.invigo.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Service
public class AuthorizationService {

    private static final Set<String> DISCOUNT_MANAGER_ROLE_NAMES = Set.of(
            "manager",
            "assistant manager",
            "warehouse manager",
            "system administrator"
    );

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;

    public AuthorizationService(UserRepository userRepository, RoleRepository roleRepository) {
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    public User requireCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getPrincipal() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required.");
        }

        Long userId;
        try {
            userId = Long.parseLong(String.valueOf(authentication.getPrincipal()));
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid authentication context.");
        }

        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."));
    }

    public String getCurrentUsername() {
        return requireCurrentUser().getUsername();
    }

    public String getCurrentActorLabel() {
        User user = requireCurrentUser();
        if (user.getName() != null && !user.getName().isBlank()) {
            return user.getName().trim();
        }
        return user.getUsername();
    }

    public boolean canManageDiscounts() {
        User user = requireCurrentUser();
        Optional<Role> role = resolveRole(user);
        String normalizedRoleName = normalize(user.getRoleName());

        return isAdminLike(user, role.orElse(null))
                || DISCOUNT_MANAGER_ROLE_NAMES.contains(normalizedRoleName)
                || role.map(r -> r.isEditDiscounts() || r.isSalesManagement()).orElse(false);
    }

    public boolean canManageSales() {
        User user = requireCurrentUser();
        Optional<Role> role = resolveRole(user);
        return isAdminLike(user, role.orElse(null))
                || role.map(Role::isSalesManagement).orElse(false);
    }

    public boolean canEditVoidSales() {
        User user = requireCurrentUser();
        Optional<Role> role = resolveRole(user);
        return isAdminLike(user, role.orElse(null))
                || role.map(r -> r.isSalesManagement() || r.isEditVoidSales()).orElse(false);
    }

    public boolean canRecordSales() {
        User user = requireCurrentUser();
        Optional<Role> role = resolveRole(user);
        return isAdminLike(user, role.orElse(null))
                || role.map(r -> r.isSalesRecording() || r.isSalesManagement() || r.isEditVoidSales()).orElse(false);
    }

    public boolean canManageInventory() {
        User user = requireCurrentUser();
        Optional<Role> role = resolveRole(user);
        return isAdminLike(user, role.orElse(null))
                || role.map(r -> r.isAddUpdateStock() || r.isInventoryTracking()).orElse(false);
    }

    public boolean canManageProducts() {
        User user = requireCurrentUser();
        Optional<Role> role = resolveRole(user);
        return isAdminLike(user, role.orElse(null))
                || role.map(r -> r.isEditProducts() || r.isProductManagement()).orElse(false);
    }

    public boolean canViewReports() {
        User user = requireCurrentUser();
        Optional<Role> role = resolveRole(user);
        return isAdminLike(user, role.orElse(null))
                || role.map(r -> r.isReportAnalytics() || r.isEditReports()).orElse(false);
    }

    public void requireDiscountManagement() {
        if (!canManageDiscounts()) {
            throw forbidden("Only manager-capable users can review or change discounts.");
        }
    }

    public void requireSalesRecording() {
        if (!canRecordSales()) {
            throw forbidden("You do not have permission to record sales.");
        }
    }

    public void requireInventoryManagement() {
        if (!canManageInventory()) {
            throw forbidden("You do not have permission to change stock batches.");
        }
    }

    public void requireProductManagement() {
        if (!canManageProducts()) {
            throw forbidden("You do not have permission to change products.");
        }
    }

    public void requireReportsView() {
        if (!canViewReports()) {
            throw forbidden("You do not have permission to view reports.");
        }
    }

    public void requireRequestReviewAccess() {
        if (canManageDiscounts()) {
            throw forbidden("Users who can already review discounts should open the review queue directly.");
        }
    }

    public void requireSaleEditAccess(Sale sale) {
        User currentUser = requireCurrentUser();
        if (canManageSales()) {
            return;
        }
        if (!canEditVoidSales()) {
            throw forbidden("You do not have permission to edit or void sales.");
        }
        if (!Objects.equals(normalize(currentUser.getUsername()), normalize(sale.getRecordedBy()))) {
            throw forbidden("You can only edit or void your own sales.");
        }
        LocalDateTime createdAt = sale.getCreatedAt();
        if (createdAt != null && createdAt.isBefore(LocalDateTime.now().minusHours(2))) {
            throw forbidden("You can only edit or void your own sales within 2 hours of recording.");
        }
    }

    public void requireSaleUnvoidAccess() {
        if (!canManageSales()) {
            throw forbidden("Only manager-capable users can unvoid sales.");
        }
    }

    public List<Sale> filterAccessibleSales(List<Sale> sales) {
        if (canManageSales()) {
            return sales;
        }
        String username = normalize(getCurrentUsername());
        return sales.stream()
                .filter(sale -> Objects.equals(normalize(sale.getRecordedBy()), username))
                .toList();
    }

    private Optional<Role> resolveRole(User user) {
        if (user == null || user.getRoleName() == null || user.getRoleName().isBlank()) {
            return Optional.empty();
        }
        return roleRepository.findByRoleNameIgnoreCase(user.getRoleName().trim());
    }

    private boolean isAdminLike(User user, Role role) {
        if (user != null && user.getRole() == UserRole.ADMIN) {
            return true;
        }
        if (role == null || role.getRoleType() == null) {
            return false;
        }
        String roleType = role.getRoleType().trim().toUpperCase(Locale.ROOT);
        return "ADMIN".equals(roleType) || "SUB_ADMIN".equals(roleType);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static ResponseStatusException forbidden(String message) {
        return new ResponseStatusException(HttpStatus.FORBIDDEN, message);
    }
}
