package invigo.invigo.controller;

import invigo.invigo.entity.User;
import invigo.invigo.service.EmailService;
import invigo.invigo.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    @Autowired
    private UserService userService;

    @Autowired
    private EmailService emailService;

    @GetMapping
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @PostMapping
    public ResponseEntity<?> createUser(@Valid @RequestBody User user) {
        try {
            User created = userService.createUser(user);
            if (created.getEmail() != null && !created.getEmail().isBlank()) {
                emailService.sendAccountCreationEmail(
                    created.getEmail(),
                    created.getName(),
                    created.getUsername(),
                    created.getRoleName() != null ? created.getRoleName() : created.getRole().toString()
                );
            }
            return ResponseEntity.ok(created);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @Valid @RequestBody User userDetails) {
        try {
            return userService.updateUser(id, userDetails)
                    .<ResponseEntity<?>>map(ResponseEntity::ok)
                    .orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(java.util.Map.of("message", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        return userService.getById(id).map(target -> {
            if ("System Administrator".equalsIgnoreCase(target.getRoleName())) {
                return ResponseEntity.status(403).<Void>build();
            }
            if (userService.deleteUser(id)) {
                return ResponseEntity.ok().<Void>build();
            }
            return ResponseEntity.notFound().<Void>build();
        }).orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/unlock")
    public ResponseEntity<?> unlockUser(@PathVariable Long id) {
        return userService.getById(id).map(user -> {
            user.setAccountLocked(false);
            user.setFailedLoginAttempts(0);
            return ResponseEntity.ok(userService.saveUser(user));
        }).orElse(ResponseEntity.notFound().build());
    }
}
