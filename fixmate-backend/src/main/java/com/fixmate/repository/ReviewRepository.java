package com.fixmate.repository;

import com.fixmate.entity.Booking;
import com.fixmate.entity.Review;
import com.fixmate.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ReviewRepository extends JpaRepository<Review, Long> {
    List<Review> findByPartner(User partner);
    boolean existsByBooking(Booking booking);
}
