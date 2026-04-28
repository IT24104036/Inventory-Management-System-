package invigo.invigo.repository;

import invigo.invigo.entity.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface RoleRepository extends JpaRepository<Role, Long> {
    boolean existsByRoleName(String roleName);
    java.util.Optional<Role> findByRoleNameIgnoreCase(String roleName);
}
