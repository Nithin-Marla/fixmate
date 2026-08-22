package com.fixmate.repository;

import com.fixmate.entity.Payment;
import com.fixmate.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByBookingId(Long bookingId);
    List<Payment> findByBookingCustomer(User customer);
    List<Payment> findByBookingPartner(User partner);

    @Query("SELECT COALESCE(SUM(p.totalAmount), 0) FROM Payment p WHERE p.booking.partner = :partner AND p.status = 'SUCCESS'")
    Double sumEarningsByPartner(@Param("partner") User partner);

    @Query("SELECT COALESCE(SUM(p.platformFee), 0) FROM Payment p WHERE p.booking.partner = :partner AND p.status = 'SUCCESS'")
    Double sumPlatformFeeByPartner(@Param("partner") User partner);

    long countByStatus(com.fixmate.enums.PaymentStatus status);
}
