package com.fixmate.repository;

import com.fixmate.entity.User;
import com.fixmate.enums.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);
    Optional<User> findByPhone(String phone);
    boolean existsByEmail(String email);
    long countByRole(Role role);
    List<User> findByRole(Role role);

    /**
     * Delete all records that reference this user via foreign keys,
     * in the correct order to avoid constraint violations.
     * Must be called inside a @Transactional context before deleting the User.
     */
    @Modifying
    @Query(value = """
            -- 1. Audit logs referencing this user
            DELETE FROM audit_logs WHERE actor_id = :id;

            -- 2. Favorites referencing this user
            DELETE FROM favorites WHERE customer_id = :id OR partner_id = :id;

            -- 3. Payments for bookings by this user
            DELETE FROM payments WHERE booking_id IN (
                SELECT id FROM bookings WHERE customer_id = :id OR partner_id = :id
            );

            -- 4. Reviews that reference this user (as customer or partner)
            DELETE FROM reviews WHERE customer_id = :id OR partner_id = :id;

            -- 5. Bookings that reference this user (as customer or partner)
            DELETE FROM bookings WHERE customer_id = :id OR partner_id = :id;

            -- 6. Notifications for this user
            DELETE FROM notifications WHERE user_id = :id;

            -- 7. Warranties for this user
            DELETE FROM warranties WHERE customer_id = :id;

            -- 8. Partner profile skills (child of partner_profiles)
            DELETE FROM partner_skills WHERE profile_id IN (
                SELECT id FROM partner_profiles WHERE user_id = :id
            );

            -- 9. Partner profile
            DELETE FROM partner_profiles WHERE user_id = :id;

            -- 10. Addresses
            DELETE FROM addresses WHERE user_id = :id;
            """, nativeQuery = true)
    void deleteUserDependents(@Param("id") Long userId);
}
