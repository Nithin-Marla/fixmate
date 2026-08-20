package com.fixmate.config;

import com.fixmate.entity.ServiceCategory;
import com.fixmate.entity.User;
import com.fixmate.enums.Role;
import com.fixmate.repository.ServiceCategoryRepository;
import com.fixmate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Seeds the database with default data on startup. Every step is idempotent:
 * categories are upserted by name, and the admin account is only created when
 * it does not exist yet, so existing data is never overwritten.
 *
 * <p>No service partners are seeded: partners must register themselves and go
 * online from the partner dashboard, so nearby search only ever returns
 * currently-active, KYC-approved accounts with a live location.
 */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final ServiceCategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        seedCategories();
        seedAdmin();
    }

    // =========================================================================
    // Service Categories (home + emergency / roadside)
    // =========================================================================

    private void seedCategories() {
        List<ServiceCategory> categories = List.of(
                category("Plumbing", "Fix leaks, blocked drains, water heaters, and all plumbing issues."),
                category("Electrical", "Wiring, switches, lighting installation, and electrical repairs."),
                category("Carpentry", "Furniture assembly, repairs, custom woodwork, and fittings."),
                category("Painting", "Interior and exterior painting for homes and offices."),
                category("Appliance Repair", "Repair and servicing of refrigerators, ACs, washing machines, and more."),
                category("Home Cleaning", "Deep cleaning, regular housekeeping, and post-renovation cleaning."),
                category("AC & HVAC", "Air conditioner installation, servicing, and repair."),
                category("Roofing & Waterproofing", "Roof repairs, waterproofing, and leakage solutions."),
                category("Pest Control", "Cockroach, termite, rodent, and bed bug control treatments."),
                category("Home Renovation", "Full or partial home renovation and remodeling services."),
                // Emergency / roadside assistance
                category("Mechanic", "Two-wheeler and four-wheeler servicing, repair, and on-spot breakdown help."),
                category("Bike Repair & Tyre Puncture", "On-spot bike repair, tyre puncture fixing, and chain/brake fixes."),
                category("Car Breakdown & Repair", "On-road car breakdown help — engine, battery, and mechanical issues."),
                category("Towing Service", "Flatbed towing and vehicle transport to the nearest garage."),
                category("Battery Jumpstart", "Instant car and bike battery jumpstart anywhere, anytime."),
                category("Emergency Fuel Delivery", "Petrol or diesel delivered to your location when you run out."),
                category("Roadside Assistance", "24x7 on-road help — flat tyres, keys locked in, and more."),
                category("Emergency Locksmith", "Locked out of home, car, or office? Instant door unlock service.")
        );

        // Upsert by name so existing installs pick up new categories without duplicating.
        categories.forEach(c -> {
            if (categoryRepository.findByName(c.getName()).isEmpty()) {
                categoryRepository.save(c);
            }
        });
    }

    private ServiceCategory category(String name, String description) {
        return ServiceCategory.builder()
                .name(name)
                .description(description)
                .isActive(true)
                .build();
    }

    // =========================================================================
    // Demo admin account (idempotent)
    // =========================================================================

    private void seedAdmin() {
        if (userRepository.findByEmail("admin@fixmate.com").isPresent()) {
            return;
        }

        User admin = User.builder()
                .firstName("FixMate")
                .lastName("Admin")
                .email("admin@fixmate.com")
                .password(passwordEncoder.encode("Admin@123"))
                .phone("9000000001")
                .role(Role.ROLE_ADMIN)
                .build();
        userRepository.save(admin);
        System.out.println("Seeded demo admin -> admin@fixmate.com / Admin@123");
    }
}
