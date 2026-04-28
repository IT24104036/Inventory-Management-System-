package invigo.invigo.controller;

import invigo.invigo.entity.OtpToken;
import invigo.invigo.entity.User;
import invigo.invigo.repository.OtpTokenRepository;
import invigo.invigo.repository.UserRepository;
import invigo.invigo.service.EmailService;
import invigo.invigo.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class PasswordResetController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private OtpTokenRepository otpTokenRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserService userService;

    /** Step 1: Request OTP — POST /api/auth/forgot-password */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required."));
        }
        if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid email address format."));
        }

        String normalizedEmail = email.trim().toLowerCase();
        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);

        if (userOpt.isPresent()) {
            otpTokenRepository.deleteByEmail(normalizedEmail);

            String otp = String.format("%06d", new SecureRandom().nextInt(1000000));
            OtpToken token = new OtpToken(normalizedEmail, otp, LocalDateTime.now().plusMinutes(10));
            otpTokenRepository.save(token);

            emailService.sendOtpEmail(normalizedEmail, otp);
        }

        return ResponseEntity.ok(Map.of("message", "If an account exists for that email, an OTP has been sent."));
    }

    /** Step 2: Verify OTP — POST /api/auth/verify-otp */
    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String otp = body.get("otp");

        if (email == null || otp == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and OTP are required."));
        }

        Optional<OtpToken> tokenOpt = otpTokenRepository.findTopByEmailOrderByExpiresAtDesc(email.trim().toLowerCase());

        if (tokenOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "No OTP found. Please request a new one."));
        }

        OtpToken token = tokenOpt.get();

        if (token.isUsed()) {
            return ResponseEntity.badRequest().body(Map.of("message", "OTP already used. Please request a new one."));
        }

        if (LocalDateTime.now().isAfter(token.getExpiresAt())) {
            return ResponseEntity.badRequest().body(Map.of("message", "OTP has expired. Please request a new one."));
        }

        if (token.getAttemptCount() >= 5) {
            token.setUsed(true);
            otpTokenRepository.save(token);
            return ResponseEntity.status(429).body(Map.of("message", "Too many failed attempts. Please request a new OTP."));
        }

        if (!token.getOtp().equals(otp.trim())) {
            token.setAttemptCount(token.getAttemptCount() + 1);
            otpTokenRepository.save(token);
            if (token.getAttemptCount() >= 5) {
                token.setUsed(true);
                otpTokenRepository.save(token);
                return ResponseEntity.status(429).body(Map.of("message", "Too many failed attempts. Please request a new OTP."));
            }
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid OTP. Please try again."));
        }

        token.setUsed(true);
        otpTokenRepository.save(token);

        return ResponseEntity.ok(Map.of("message", "OTP verified successfully."));
    }

    /** Step 3: Reset Password — POST /api/auth/reset-password */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        String newPassword = body.get("newPassword");

        if (email == null || newPassword == null || newPassword.length() < 8) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email and a password of at least 8 characters are required."));
        }

        String normalizedEmail = email.trim().toLowerCase();

        // Require that the OTP was verified before allowing password reset
        Optional<OtpToken> verifiedOtp = otpTokenRepository.findTopByEmailOrderByExpiresAtDesc(normalizedEmail);
        if (verifiedOtp.isEmpty() || !verifiedOtp.get().isUsed()
                || LocalDateTime.now().isAfter(verifiedOtp.get().getExpiresAt())) {
            return ResponseEntity.badRequest().body(Map.of("message", "OTP verification required before resetting password."));
        }

        Optional<User> userOpt = userRepository.findByEmail(normalizedEmail);
        if (userOpt.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Account not found."));
        }

        User user = userOpt.get();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setFailedLoginAttempts(0);
        user.setAccountLocked(false);
        userRepository.save(user);

        otpTokenRepository.deleteByEmail(normalizedEmail);

        return ResponseEntity.ok(Map.of("message", "Password reset successfully. You can now log in."));
    }
}
