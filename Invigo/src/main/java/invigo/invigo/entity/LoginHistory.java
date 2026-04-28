package invigo.invigo.entity;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "login_history")
public class LoginHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // We store the username attempted or logged in with. 
    @Column(nullable = false)
    private String username;

    // Actual user name if available
    private String name;

    @Column(name = "login_time", nullable = false)
    private LocalDateTime loginTime;

    @Column(name = "ip_address")
    private String ipAddress;

    @Column(name = "device_browser")
    private String deviceBrowser;

    @Column(nullable = false)
    private String status;

    public LoginHistory() {
    }

    public LoginHistory(String username, String name, LocalDateTime loginTime, String ipAddress, String deviceBrowser, String status) {
        this.username = username;
        this.name = name;
        this.loginTime = loginTime;
        this.ipAddress = ipAddress;
        this.deviceBrowser = deviceBrowser;
        this.status = status;
    }

    public Long getId() {
        return id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public LocalDateTime getLoginTime() {
        return loginTime;
    }

    public void setLoginTime(LocalDateTime loginTime) {
        this.loginTime = loginTime;
    }

    public String getIpAddress() {
        return ipAddress;
    }

    public void setIpAddress(String ipAddress) {
        this.ipAddress = ipAddress;
    }

    public String getDeviceBrowser() {
        return deviceBrowser;
    }

    public void setDeviceBrowser(String deviceBrowser) {
        this.deviceBrowser = deviceBrowser;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
