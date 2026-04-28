package invigo.invigo;

import invigo.invigo.controller.AuthController;
import invigo.invigo.entity.User;
import invigo.invigo.entity.UserRole;
import invigo.invigo.repository.RoleRepository;
import invigo.invigo.service.JwtService;
import invigo.invigo.service.LoginHistoryService;
import invigo.invigo.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthControllerTest {

    @Mock
    private UserService userService;

    @Mock
    private LoginHistoryService loginHistoryService;

    @Mock
    private RoleRepository roleRepository;

    @Mock
    private JwtService jwtService;

    @Mock
    private HttpServletRequest request;

    @InjectMocks
    private AuthController authController;

    @Test
    void login_rejectsRoleMismatchAndCountsItAsFailedAttempt() {
        User user = new User();
        user.setId(1L);
        user.setUsername("cashier1");
        user.setName("Cashier One");
        user.setRole(UserRole.STAFF);
        user.setRoleName("Warehouse Staff");
        user.setFailedLoginAttempts(1);

        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(request.getHeader("User-Agent")).thenReturn("JUnit");
        when(userService.findByUsername("cashier1")).thenReturn(Optional.of(user));
        when(userService.verifyPassword(user, "secret")).thenReturn(true);
        when(userService.saveUser(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<?> response = authController.login(
                Map.of(
                        "username", "cashier1",
                        "password", "secret",
                        "role", "Admin"
                ),
                request
        );

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(2, user.getFailedLoginAttempts());
        assertFalse(user.isAccountLocked());
        verify(loginHistoryService).recordLogin(
                eq("cashier1"),
                eq("Cashier One"),
                eq("127.0.0.1"),
                eq("JUnit"),
                eq("Failed (Role Mismatch)")
        );
    }

    @Test
    void login_doesNotLockAdminAfterThreeFailedAttempts() {
        User user = new User();
        user.setId(2L);
        user.setUsername("admin1");
        user.setName("Admin One");
        user.setRole(UserRole.ADMIN);
        user.setRoleName("System Administrator");
        user.setFailedLoginAttempts(2);

        when(request.getRemoteAddr()).thenReturn("127.0.0.1");
        when(request.getHeader("User-Agent")).thenReturn("JUnit");
        when(userService.findByUsername("admin1")).thenReturn(Optional.of(user));
        when(userService.verifyPassword(user, "wrong-secret")).thenReturn(false);
        when(userService.saveUser(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ResponseEntity<?> response = authController.login(
                Map.of(
                        "username", "admin1",
                        "password", "wrong-secret",
                        "role", "System Administrator"
                ),
                request
        );

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals(3, user.getFailedLoginAttempts());
        assertFalse(user.isAccountLocked());
    }
}
