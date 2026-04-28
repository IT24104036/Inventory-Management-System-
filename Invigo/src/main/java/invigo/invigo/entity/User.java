package invigo.invigo.entity;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import java.time.LocalDate;

@Entity
@Table(name = "users") // Pluralized to avoid SQL keyword conflicts
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String username;

    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    @Column(nullable = false, length = 255)
    private String password;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private LocalDate doj;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserRole role;

    /** Specific role label, e.g. "Warehouse Staff", "Senior Cashier" */
    @Column
    private String roleName;

    @Email
    @Column(unique = true)
    private String email;

    @Column(nullable = false, columnDefinition = "int default 0")
    private int failedLoginAttempts = 0;

    @Column(nullable = false, columnDefinition = "bit default 0")
    private boolean accountLocked = false;

    // Default constructor for JPA
    public User() {}

    public User(String username, String password, String name, LocalDate doj, UserRole role) {
        this.username = username;
        this.password = password;
        this.name = name;
        this.doj = doj;
        this.role = role;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }

    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    public LocalDate getDoj() { return doj; }
    public void setDoj(LocalDate doj) { this.doj = doj; }

    public UserRole getRole() { return role; }
    public void setRole(UserRole role) { this.role = role; }

    public String getRoleName() { return roleName; }
    public void setRoleName(String roleName) { this.roleName = roleName; }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }

    public int getFailedLoginAttempts() { return failedLoginAttempts; }
    public void setFailedLoginAttempts(int failedLoginAttempts) { this.failedLoginAttempts = failedLoginAttempts; }

    public boolean isAccountLocked() { return accountLocked; }
    public void setAccountLocked(boolean accountLocked) { this.accountLocked = accountLocked; }
}
