package invigo.invigo.controller;

import invigo.invigo.entity.Role;
import invigo.invigo.entity.User;
import invigo.invigo.entity.UserRole;
import invigo.invigo.repository.RoleRepository;
import invigo.invigo.service.JwtService;
import invigo.invigo.service.LoginHistoryService;
import invigo.invigo.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserService userService;

    @Autowired
    private LoginHistoryService loginHistoryService;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private JwtService jwtService;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> credentials, HttpServletRequest request) {
        String username = credentials.get("username");
        String email = credentials.get("email");
        String password = credentials.get("password");
        String roleInput = credentials.get("role");
        String normalizedUsername = username != null ? username.trim() : null;
        String normalizedEmail = email != null ? email.trim().toLowerCase() : null;
        String normalizedRoleInput = roleInput != null ? roleInput.trim() : null;

        String ipAddress = request.getRemoteAddr();
        String deviceBrowser = request.getHeader("User-Agent");

        if (((normalizedUsername == null || normalizedUsername.isBlank()) && (normalizedEmail == null || normalizedEmail.isBlank()))
                || password == null || password.isBlank()
                || normalizedRoleInput == null || normalizedRoleInput.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username or email, password, and role are required."));
        }

        // Find user by email first, fallback to username
        Optional<User> userOpt = Optional.empty();
        if (normalizedEmail != null && !normalizedEmail.isBlank()) {
            userOpt = userService.findByEmail(normalizedEmail);
        }
        if (userOpt.isEmpty() && normalizedUsername != null && !normalizedUsername.isBlank()) {
            userOpt = userService.findByUsername(normalizedUsername);
        }

        if (userOpt.isPresent()) {
            User matchingUser = userOpt.get();

            if (matchingUser.isAccountLocked()) {
                loginHistoryService.recordLogin(matchingUser.getUsername(), matchingUser.getName(), ipAddress, deviceBrowser, "Failed (Locked)");
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Account locked. Please contact the admin to unlock."));
            }

            boolean passwordMatches = userService.verifyPassword(matchingUser, password);
            boolean roleMatches = roleMatches(matchingUser, normalizedRoleInput);

            if (passwordMatches && roleMatches) {
                User loggedInUser = matchingUser;

                loggedInUser.setFailedLoginAttempts(0);
                userService.saveUser(loggedInUser);

                Map<String, Object> response = new HashMap<>();
                response.put("id", loggedInUser.getId());
                response.put("username", loggedInUser.getUsername());
                response.put("name", loggedInUser.getName());
                response.put("role", loggedInUser.getRole());
                response.put("roleName", loggedInUser.getRoleName());
                response.put("homeRoute", loggedInUser.getRole().name().equalsIgnoreCase("ADMIN") ? "/admin" : "/staff");
                response.put("message", "Login successful");

                // --- Resolve permission flags from the matching Role entity ---
                List<Role> allRoles = roleRepository.findAll();
                String userRoleEnum = loggedInUser.getRole().name(); // "ADMIN" or "STAFF"
                String specificRoleName = loggedInUser.getRoleName(); // e.g. "Warehouse Staff"

                // 1. Exact match by roleName if set
                Optional<Role> matchedRole = (specificRoleName != null && !specificRoleName.isEmpty())
                    ? allRoles.stream().filter(r -> r.getRoleName().equalsIgnoreCase(specificRoleName)).findFirst()
                    : allRoles.stream()
                        .filter(r -> r.getRoleName().toUpperCase().contains(userRoleEnum)
                                  || userRoleEnum.contains(r.getRoleName().toUpperCase()))
                        .findFirst();

                Map<String, Boolean> permissions = new HashMap<>();
                if (matchedRole.isPresent()) {
                    Role r = matchedRole.get();
                    response.put("roleType", r.getRoleType());
                    permissions.put("inventoryTracking", r.isInventoryTracking());
                    permissions.put("productManagement", r.isProductManagement());
                    permissions.put("salesManagement",   r.isSalesManagement());
                    permissions.put("discountsAlerts",   r.isDiscountsAlerts());
                    permissions.put("reportAnalytics",   r.isReportAnalytics());
                    permissions.put("userControl",       r.isUserControl());
                    permissions.put("addUpdateStock",    r.isAddUpdateStock());
                    permissions.put("salesRecording",    r.isSalesRecording());
                    permissions.put("editVoidSales",     r.isEditVoidSales());
                    permissions.put("editProducts",      r.isEditProducts());
                    permissions.put("editDiscounts",     r.isEditDiscounts());
                    permissions.put("editReports",       r.isEditReports());
                } else if ("ADMIN".equals(userRoleEnum)) {
                    permissions.put("inventoryTracking", true);
                    permissions.put("productManagement", true);
                    permissions.put("salesManagement",   true);
                    permissions.put("discountsAlerts",   true);
                    permissions.put("reportAnalytics",   true);
                    permissions.put("userControl",       true);
                    permissions.put("addUpdateStock",    true);
                    permissions.put("salesRecording",    true);
                    permissions.put("editVoidSales",     true);
                    permissions.put("editProducts",      true);
                    permissions.put("editDiscounts",     true);
                    permissions.put("editReports",       true);
                } else {
                    permissions.put("inventoryTracking", false);
                    permissions.put("productManagement", false);
                    permissions.put("salesManagement",   false);
                    permissions.put("discountsAlerts",   false);
                    permissions.put("reportAnalytics",   false);
                    permissions.put("userControl",       false);
                    permissions.put("addUpdateStock",    false);
                    permissions.put("salesRecording",    false);
                    permissions.put("editVoidSales",     false);
                    permissions.put("editProducts",      false);
                    permissions.put("editDiscounts",     false);
                    permissions.put("editReports",       false);
                }
                response.put("permissions", permissions);

                String jwtRole = loggedInUser.getRole().name();
                String token = jwtService.generateToken(loggedInUser.getId(), loggedInUser.getUsername(), jwtRole);
                response.put("token", token);

                loginHistoryService.recordLogin(loggedInUser.getUsername(), loggedInUser.getName(), ipAddress, deviceBrowser, "Success");
                return ResponseEntity.ok(response);
            } else {
                matchingUser.setFailedLoginAttempts(matchingUser.getFailedLoginAttempts() + 1);
                boolean lockedNow = false;
                boolean exemptFromLockout = matchingUser.getRole() == UserRole.ADMIN;
                if (matchingUser.getFailedLoginAttempts() >= 3 && !exemptFromLockout) {
                    matchingUser.setAccountLocked(true);
                    lockedNow = true;
                }
                userService.saveUser(matchingUser);

                String failureStatus = !roleMatches ? "Failed (Role Mismatch)" : "Failed";
                loginHistoryService.recordLogin(matchingUser.getUsername(), matchingUser.getName(), ipAddress, deviceBrowser, failureStatus);

                if (lockedNow) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("message", "Account locked. Please contact the admin to unlock."));
                } else if (!roleMatches) {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid role for this account."));
                } else {
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid credentials"));
                }
            }
        }

        String identifier = (normalizedEmail != null && !normalizedEmail.isBlank()) ? normalizedEmail : normalizedUsername;
        loginHistoryService.recordLogin(identifier, "Unknown", ipAddress, deviceBrowser, "Failed");
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Invalid credentials"));
    }

    private boolean roleMatches(User user, String submittedRole) {
        String normalizedSubmitted = normalize(submittedRole);
        if (normalizedSubmitted.isBlank()) {
            return false;
        }

        String roleName = normalize(user.getRoleName());
        String enumRole = user.getRole() != null ? normalize(user.getRole().name()) : "";

        return normalizedSubmitted.equals(roleName) || normalizedSubmitted.equals(enumRole);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }
}
