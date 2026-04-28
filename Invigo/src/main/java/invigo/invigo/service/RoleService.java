package invigo.invigo.service;

import invigo.invigo.entity.Role;
import invigo.invigo.repository.RoleRepository;
import invigo.invigo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class RoleService {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    public List<Role> getAllRoles() {
        return roleRepository.findAll();
    }

    public Role createRole(Role role) {
        if (roleRepository.existsByRoleName(role.getRoleName())) {
            throw new IllegalArgumentException("A role with this name already exists.");
        }
        if ("ADMIN".equalsIgnoreCase(role.getRoleType())) {
            throw new IllegalArgumentException("Cannot create roles with ADMIN type. Use STAFF or SUB_ADMIN.");
        }
        role.setLastModified(LocalDateTime.now());
        return roleRepository.save(role);
    }

    public Optional<Role> updateRole(Long id, Role roleDetails) {
        return roleRepository.findById(id).map(existing -> {
            existing.setRoleName(roleDetails.getRoleName());
            existing.setRoleType(roleDetails.getRoleType());
            existing.setDescription(roleDetails.getDescription());
            existing.setInventoryTracking(roleDetails.isInventoryTracking());
            existing.setProductManagement(roleDetails.isProductManagement());
            existing.setSalesManagement(roleDetails.isSalesManagement());
            existing.setDiscountsAlerts(roleDetails.isDiscountsAlerts());
            existing.setReportAnalytics(roleDetails.isReportAnalytics());
            existing.setUserControl(roleDetails.isUserControl());
            existing.setAddUpdateStock(roleDetails.isAddUpdateStock());
            existing.setEditVoidSales(roleDetails.isEditVoidSales());   // ← was missing
            existing.setEditProducts(roleDetails.isEditProducts());     // ← was missing
            existing.setEditDiscounts(roleDetails.isEditDiscounts());   // ← was missing
            existing.setEditReports(roleDetails.isEditReports());       // ← was missing
            existing.setLastModified(LocalDateTime.now());
            return roleRepository.save(existing);
        });
    }


    public boolean deleteRole(Long id) {
        return roleRepository.findById(id).map(role -> {
            long assignedCount = userRepository.findAll().stream()
                .filter(u -> role.getRoleName().equalsIgnoreCase(u.getRoleName()))
                .count();
            if (assignedCount > 0) {
                throw new IllegalArgumentException(
                    "Cannot delete \"" + role.getRoleName() + "\" — " + assignedCount +
                    (assignedCount == 1 ? " user is" : " users are") + " currently assigned to this role. Reassign them first."
                );
            }
            roleRepository.deleteById(id);
            return true;
        }).orElse(false);
    }
}
