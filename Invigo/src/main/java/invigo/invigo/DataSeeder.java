package invigo.invigo;

import invigo.invigo.entity.*;
import invigo.invigo.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Component
@Order(2)
public class DataSeeder implements CommandLineRunner {

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private BatchRepository batchRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Override
    public void run(String... args) throws Exception {
        // Seed Admin Account
        if (userRepository.findByUsername("admin").isEmpty()) {
            User admin = new User(
                    "admin",
                    passwordEncoder.encode("Admin@123"),
                    "System Administrator",
                    LocalDate.now(),
                    UserRole.ADMIN
            );
            admin.setRoleName("System Administrator");
            userRepository.save(admin);
            System.out.println("Default Admin account created: admin / Admin@123");

            // Increment System Administrator role's usersAssigned counter
            roleRepository.findAll().stream()
                .filter(r -> "System Administrator".equalsIgnoreCase(r.getRoleName()))
                .findFirst()
                .ifPresent(r -> {
                    r.setUsersAssigned(r.getUsersAssigned() + 1);
                    roleRepository.save(r);
                });
        }

        // --- Seed some demo products & batches for POS / FEFO logic ---
        if (productRepository.count() == 0) {
            Product milk = new Product("P1", "Fresh Milk 1L", "Dairy", "Happy Cow Dairies", 250.0, 350.0);
            Product yogurt = new Product("P2", "Yogurt Plain 500g", "Dairy", "Happy Cow Dairies", 300.0, 420.0);
            Product cheese = new Product("P3", "Cheese Spread 200g", "Dairy", "Artisan Cheesemakers", 400.0, 550.0);
            Product greens = new Product("P4", "Leafy Greens Mix", "Produce", "Valley Farms", 180.0, 280.0);

            milk = productRepository.save(milk);
            yogurt = productRepository.save(yogurt);
            cheese = productRepository.save(cheese);
            greens = productRepository.save(greens);

            // Simple FEFO-ready batches (two batches per product, different expiry dates)
            batchRepository.save(new Batch(milk, 20, LocalDate.now().plusDays(2)));
            batchRepository.save(new Batch(milk, 30, LocalDate.now().plusDays(7)));

            batchRepository.save(new Batch(yogurt, 15, LocalDate.now().plusDays(3)));
            batchRepository.save(new Batch(cheese, 50, LocalDate.now().plusDays(25)));

            batchRepository.save(new Batch(greens, 10, LocalDate.now().plusDays(4)));

            System.out.println("Seeded demo products and batches for POS / FEFO testing");
        }

        // Roles are seeded by DemoDataLoader (component/DemoDataLoader.java) with correct permissions.
    }
}
