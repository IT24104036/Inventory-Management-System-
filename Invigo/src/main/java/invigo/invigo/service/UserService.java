package invigo.invigo.service;

import invigo.invigo.entity.Role;
import invigo.invigo.entity.User;
import invigo.invigo.repository.RoleRepository;
import invigo.invigo.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.List;
import java.util.Optional;

@Service
public class UserService {

    private static final String TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*";
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** Adjusts a role's usersAssigned counter by delta (+1 or -1). */
    private void adjustRoleCount(String roleName, int delta) {
        if (roleName == null || roleName.isBlank()) return;
        roleRepository.findAll().stream()
            .filter(r -> r.getRoleName().equalsIgnoreCase(roleName))
            .findFirst()
            .ifPresent(r -> {
                r.setUsersAssigned(Math.max(0, r.getUsersAssigned() + delta));
                roleRepository.save(r);
            });
    }

    public Optional<User> authenticate(String username, String password) {
        Optional<User> user = userRepository.findByUsername(username);
        if (user.isPresent() && passwordEncoder.matches(password, user.get().getPassword())) {
            return user;
        }
        return Optional.empty();
    }

    public boolean verifyPassword(User user, String password) {
        return passwordEncoder.matches(password, user.getPassword());
    }

    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public Optional<User> getById(Long id) {
        return userRepository.findById(id);
    }

    /**
     * Direct save – used when the caller has already made field mutations
     * (e.g. the staff profile update flow where we handle password hashing ourselves).
     */
    public User saveUser(User user) {
        return userRepository.save(user);
    }

    private String normalize(String value) {
        return value == null ? null : value.trim();
    }

    private String normalizeEmail(String email) {
        String normalized = normalize(email);
        return normalized == null ? null : normalized.toLowerCase();
    }

    private String generateTemporaryPassword() {
        StringBuilder builder = new StringBuilder();
        for (int i = 0; i < 24; i++) {
            builder.append(TEMP_PASSWORD_ALPHABET.charAt(SECURE_RANDOM.nextInt(TEMP_PASSWORD_ALPHABET.length())));
        }
        return builder.toString();
    }

    private void validatePasswordLength(String password, boolean allowBlank) {
        String normalized = normalize(password);
        if (allowBlank && (normalized == null || normalized.isBlank())) {
            return;
        }
        if (normalized == null || normalized.length() < 8 || normalized.length() > 30) {
            throw new IllegalArgumentException("Password must be between 8 and 30 characters.");
        }
    }

    private invigo.invigo.entity.UserRole resolveRouteRole(User user) {
        if (user.getRoleName() != null) {
            Optional<Role> matchingRole = roleRepository.findAll().stream()
                .filter(r -> r.getRoleName().equalsIgnoreCase(user.getRoleName()))
                .findFirst();
            if (matchingRole.isPresent()) {
                String type = matchingRole.get().getRoleType();
                if ("ADMIN".equalsIgnoreCase(type) || "SUB_ADMIN".equalsIgnoreCase(type)) {
                    return invigo.invigo.entity.UserRole.ADMIN;
                }
            }
        }
        return user.getRole() != null ? user.getRole() : invigo.invigo.entity.UserRole.STAFF;
    }

    public User createUser(User user) {
        String normalizedUsername = normalize(user.getUsername());
        String normalizedName = normalize(user.getName());
        String normalizedEmail = normalizeEmail(user.getEmail());

        if (normalizedUsername == null || normalizedUsername.isBlank()) {
            throw new IllegalArgumentException("Username is required.");
        }
        if (normalizedName == null || normalizedName.length() < 2 || normalizedName.length() > 50) {
            throw new IllegalArgumentException("Full name must be between 2 and 50 characters.");
        }
        if (normalizedEmail == null || normalizedEmail.isBlank()) {
            throw new IllegalArgumentException("Work email is required for secure onboarding.");
        }
        if (userRepository.findByUsername(normalizedUsername).isPresent()) {
            throw new IllegalArgumentException("Username already exists.");
        }
        if (userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            throw new IllegalArgumentException("Email already in use.");
        }
        // Only one System Administrator is allowed
        if ("System Administrator".equalsIgnoreCase(user.getRoleName())) {
            boolean adminExists = userRepository.findAll().stream()
                .anyMatch(u -> "System Administrator".equalsIgnoreCase(u.getRoleName()));
            if (adminExists) {
                throw new IllegalArgumentException("Only one System Administrator is allowed.");
            }
        }
        String rawPassword = normalize(user.getPassword());
        validatePasswordLength(rawPassword, true);
        String passwordToPersist = (rawPassword == null || rawPassword.isBlank()) ? generateTemporaryPassword() : rawPassword;

        user.setUsername(normalizedUsername);
        user.setName(normalizedName);
        user.setEmail(normalizedEmail);
        user.setPassword(passwordEncoder.encode(passwordToPersist));
        user.setRole(resolveRouteRole(user));
        User saved = userRepository.save(user);
        adjustRoleCount(saved.getRoleName(), +1);
        return saved;
    }

    public Optional<User> updateUser(Long id, User userDetails) {
        return userRepository.findById(id).map(user -> {
            String oldRoleName = user.getRoleName();
            String normalizedUsername = normalize(userDetails.getUsername());
            String normalizedName = normalize(userDetails.getName());
            String normalizedEmail = normalizeEmail(userDetails.getEmail());

            if (normalizedUsername == null || normalizedUsername.isBlank()) {
                throw new IllegalArgumentException("Username is required.");
            }
            if (normalizedName == null || normalizedName.length() < 2 || normalizedName.length() > 50) {
                throw new IllegalArgumentException("Full name must be between 2 and 50 characters.");
            }

            userRepository.findByUsername(normalizedUsername)
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> {
                    throw new IllegalArgumentException("Username already exists.");
                });

            if (normalizedEmail != null && !normalizedEmail.isBlank()) {
                userRepository.findByEmailIgnoreCase(normalizedEmail)
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new IllegalArgumentException("Email already in use.");
                    });
            }

            user.setName(normalizedName);
            user.setUsername(normalizedUsername);
            user.setEmail(normalizedEmail);
            user.setDoj(userDetails.getDoj());
            user.setRoleName(userDetails.getRoleName());
            user.setRole(resolveRouteRole(user));
            if (userDetails.getPassword() != null && !userDetails.getPassword().isEmpty()) {
                validatePasswordLength(userDetails.getPassword(), false);
                user.setPassword(passwordEncoder.encode(userDetails.getPassword()));
            }
            User saved = userRepository.save(user);
            // Adjust counts if roleName changed
            String newRoleName = saved.getRoleName();
            if (oldRoleName != null && !oldRoleName.equalsIgnoreCase(newRoleName != null ? newRoleName : "")) {
                adjustRoleCount(oldRoleName, -1);
                adjustRoleCount(newRoleName, +1);
            }
            return saved;
        });
    }

    public boolean deleteUser(Long id) {
        return userRepository.findById(id).map(user -> {
            adjustRoleCount(user.getRoleName(), -1);
            userRepository.deleteById(id);
            return true;
        }).orElse(false);
    }
}
