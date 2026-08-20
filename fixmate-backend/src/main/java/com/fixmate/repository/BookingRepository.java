package com.fixmate.repository;

import com.fixmate.entity.Booking;
import com.fixmate.entity.User;
import com.fixmate.enums.BookingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {
    List<Booking> findByCustomer(User customer);
    List<Booking> findByPartner(User partner);
    List<Booking> findByCustomerAndStatusOrderByScheduledDateDesc(User customer, BookingStatus status);

    long countByStatus(BookingStatus status);
    long countByIsEmergencyTrue();

    @Query("SELECT SUM(b.totalAmount) FROM Booking b WHERE b.status = :status")
    Double sumTotalAmountByStatus(@Param("status") BookingStatus status);
}
