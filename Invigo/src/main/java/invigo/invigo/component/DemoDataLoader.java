package invigo.invigo.component;

import invigo.invigo.entity.Role;
import invigo.invigo.repository.RoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
@Order(1)
public class DemoDataLoader implements CommandLineRunner {

    @Autowired
    private RoleRepository roleRepository;

    @Override
    public void run(String... args) throws Exception {
        seedRoles();
    }

    private void seedRoles() {
        List<Role> existingRoles = roleRepository.findAll();

        // Remove legacy roles that should no longer exist
        List<String> legacyRoles = List.of("Senior Cashier", "Shelf Stocker");
        for (String legacyName : legacyRoles) {
            existingRoles.stream()
                .filter(r -> r.getRoleName().equalsIgnoreCase(legacyName))
                .findFirst()
                .ifPresent(roleRepository::delete);
        }

        // Define each role with its logical default permissions
        Object[][] roleDefs = {
            // { roleName, desc, invTrack, prodMgmt, salesMgmt, discAlerts, rptAnalyt, userCtrl, addUpdateStock }
            { "System Administrator", "Owner / Full Access",  true,  true,  true,  true,  true,  true,  true  },
            { "Store Manager",        "High (No Discounts)",  false,  false,  false,  false, false,  false, false  },
            { "Cashier",              "Medium (Sales only)",  false, false, false,  false, false, false, false },
            { "Warehouse Staff",      "Medium (Inventory)",   false,  false,  false, false, false, false, false  },
            { "General Staff",        "Low (Limited)",        false, false, false,  false, false, false, false },
        };

        for (Object[] def : roleDefs) {
            String roleName = (String) def[0];
            Role existing = existingRoles.stream()
                .filter(er -> er.getRoleName().equalsIgnoreCase(roleName))
                .findFirst().orElse(null);

            if (existing == null) {
                Role r = new Role(roleName, (String) def[1]);
                if ("System Administrator".equals(roleName)) {
                    r.setRoleType("ADMIN");
                }
                r.setInventoryTracking((boolean) def[2]);
                r.setProductManagement((boolean) def[3]);
                r.setSalesManagement((boolean)   def[4]);
                r.setDiscountsAlerts((boolean)   def[5]);
                r.setReportAnalytics((boolean)   def[6]);
                r.setUserControl((boolean)       def[7]);
                r.setAddUpdateStock((boolean)    def[8]);
                roleRepository.save(r);
            } else {
                boolean changed = false;
                String expectedDesc = (String) def[1];
                if (expectedDesc != null && !expectedDesc.equals(existing.getDescription())) {
                    existing.setDescription(expectedDesc);
                    changed = true;
                }
                if ("System Administrator".equals(roleName)
                        && !"ADMIN".equals(existing.getRoleType())) {
                    existing.setRoleType("ADMIN");
                    changed = true;
                }
                if (changed) {
                    roleRepository.save(existing);
                }
            }
        }
    }
}
