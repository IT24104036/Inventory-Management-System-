package invigo.invigo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.io.IOException;
import java.net.URISyntaxException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TimeZone;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class InvigoApplication {

    public static void main(String[] args) {
        // Force JVM timezone to Sri Lanka (UTC+5:30) so all LocalDateTime.now()
        // calls produce the correct local time instead of UTC.
        TimeZone.setDefault(TimeZone.getTimeZone("Asia/Colombo"));
        loadLocalEnvOverrides();
        SpringApplication.run(InvigoApplication.class, args);
    }

    private static void loadLocalEnvOverrides() {
        for (Path candidate : envFileCandidates()) {
            if (!Files.exists(candidate)) {
                continue;
            }

            try {
                Map<String, String> values = parseEnvFile(candidate);
                applyOverrides(values);
                String dbUrl = System.getProperty("spring.datasource.url", values.getOrDefault("DB_URL", ""));
                if (!dbUrl.isBlank()) {
                    System.out.println("Loaded config from " + candidate.toAbsolutePath());
                    System.out.println("Resolved datasource URL: " + dbUrl);
                }
                return;
            } catch (IOException ex) {
                System.err.println("Failed to load env file: " + candidate.toAbsolutePath());
                ex.printStackTrace(System.err);
            }
        }
    }

    private static List<Path> envFileCandidates() {
        Set<Path> candidates = new LinkedHashSet<>();
        addCandidate(candidates, Path.of("Invigo", ".env"));
        addCandidate(candidates, Path.of(".env"));
        addCodeLocationCandidates(candidates);
        return List.copyOf(candidates);
    }

    private static void addCodeLocationCandidates(Set<Path> candidates) {
        try {
            Path codeLocation = Path.of(InvigoApplication.class.getProtectionDomain()
                    .getCodeSource()
                    .getLocation()
                    .toURI());
            Path basePath = Files.isRegularFile(codeLocation) ? codeLocation.getParent() : codeLocation;
            if (basePath == null) {
                return;
            }

            addCandidate(candidates, basePath.resolve("..").resolve(".env"));
            addCandidate(candidates, basePath.resolve("..").resolve("..").resolve(".env"));
            addCandidate(candidates, basePath.resolve("..").resolve("..").resolve("..").resolve(".env"));
        } catch (IllegalArgumentException | URISyntaxException ex) {
            System.err.println("Failed to resolve application path for .env lookup: " + ex.getMessage());
        }
    }

    private static void addCandidate(Set<Path> candidates, Path candidate) {
        candidates.add(candidate.toAbsolutePath().normalize());
    }

    private static Map<String, String> parseEnvFile(Path path) throws IOException {
        Map<String, String> values = new LinkedHashMap<>();
        for (String rawLine : Files.readAllLines(path)) {
            String line = rawLine.trim();
            if (line.isEmpty() || line.startsWith("#")) {
                continue;
            }

            int separator = line.indexOf('=');
            if (separator <= 0) {
                continue;
            }

            String key = line.substring(0, separator).trim();
            String value = line.substring(separator + 1).trim();
            values.put(key, value);
        }
        return values;
    }

    private static void applyOverrides(Map<String, String> values) {
        Map<String, String> propertyMappings = new LinkedHashMap<>();
        propertyMappings.put("DB_URL", "spring.datasource.url");
        propertyMappings.put("DB_USERNAME", "spring.datasource.username");
        propertyMappings.put("DB_PASSWORD", "spring.datasource.password");
        propertyMappings.put("JPA_SHOW_SQL", "spring.jpa.show-sql");
        propertyMappings.put("JPA_DDL_AUTO", "spring.jpa.hibernate.ddl-auto");
        propertyMappings.put("MAIL_HOST", "spring.mail.host");
        propertyMappings.put("MAIL_PORT", "spring.mail.port");
        propertyMappings.put("MAIL_USERNAME", "spring.mail.username");
        propertyMappings.put("MAIL_PASSWORD", "spring.mail.password");
        propertyMappings.put("MAIL_SMTP_AUTH", "spring.mail.properties.mail.smtp.auth");
        propertyMappings.put("MAIL_SMTP_STARTTLS", "spring.mail.properties.mail.smtp.starttls.enable");
        propertyMappings.put("MAIL_SMTP_STARTTLS_REQUIRED", "spring.mail.properties.mail.smtp.starttls.required");
        propertyMappings.put("MAIL_SMTP_CONNECTION_TIMEOUT", "spring.mail.properties.mail.smtp.connectiontimeout");
        propertyMappings.put("MAIL_SMTP_TIMEOUT", "spring.mail.properties.mail.smtp.timeout");
        propertyMappings.put("MAIL_SMTP_WRITE_TIMEOUT", "spring.mail.properties.mail.smtp.writetimeout");
        propertyMappings.put("JWT_SECRET", "jwt.secret");
        propertyMappings.put("JWT_EXPIRATION_MS", "jwt.expiration-ms");
        propertyMappings.put("ML_API_URL", "ml.api.url");
        propertyMappings.put("ML_AUTO_SCAN_ENABLED", "ml.auto-scan.enabled");
        propertyMappings.put("ML_AUTO_SCAN_FIXED_DELAY_MS", "ml.auto-scan.fixed-delay-ms");
        propertyMappings.put("ML_AUTO_SCAN_INITIAL_DELAY_MS", "ml.auto-scan.initial-delay-ms");
        propertyMappings.put("APP_CORS_ALLOWED_ORIGINS", "app.cors.allowed-origins");
        propertyMappings.put("APP_FRONTEND_BASE_URL", "app.frontend.base-url");
        propertyMappings.put("APP_MAIL_FROM_ADDRESS", "app.mail.from-address");
        propertyMappings.put("APP_MAIL_FROM_NAME", "app.mail.from-name");

        for (Map.Entry<String, String> entry : values.entrySet()) {
            String envKey = entry.getKey();
            String value = entry.getValue();
            if (value.isBlank()) {
                continue;
            }

            System.setProperty(envKey, value);
            String propertyKey = propertyMappings.get(envKey);
            if (propertyKey != null) {
                System.setProperty(propertyKey, value);
            }
        }
    }
}
