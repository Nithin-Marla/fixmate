package com.fixmate.service;

import com.fixmate.dto.ReviewRequestDto;
import com.fixmate.dto.ReviewResponseDto;
import com.fixmate.entity.Booking;
import com.fixmate.entity.Review;
import com.fixmate.entity.ServicePartnerProfile;
import com.fixmate.entity.User;
import com.fixmate.enums.BookingStatus;
import com.fixmate.enums.Role;
import com.fixmate.repository.BookingRepository;
import com.fixmate.repository.ReviewRepository;
import com.fixmate.repository.ServicePartnerProfileRepository;
import com.fixmate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final BookingRepository bookingRepository;
    private final ServicePartnerProfileRepository partnerProfileRepository;
    private final UserRepository userRepository;

    public ReviewResponseDto createReview(User customer, Long bookingId, ReviewRequestDto request) {
        if (customer.getRole() != Role.ROLE_CUSTOMER) {
            throw new RuntimeException("Only customers can submit reviews.");
        }

        if (request.getRating() < 1 || request.getRating() > 5) {
            throw new RuntimeException("Rating must be between 1 and 5.");
        }

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found."));

        if (!booking.getCustomer().getId().equals(customer.getId())) {
            throw new RuntimeException("You can only review your own bookings.");
        }

        if (booking.getStatus() != BookingStatus.COMPLETED) {
            throw new RuntimeException("You can only review COMPLETED bookings.");
        }

        if (reviewRepository.existsByBooking(booking)) {
            throw new RuntimeException("You have already reviewed this booking.");
        }

        Review review = Review.builder()
                .booking(booking)
                .customer(customer)
                .partner(booking.getPartner())
                .rating(request.getRating())
                .comment(request.getComment())
                .build();

        Review savedReview = reviewRepository.save(review);
        
        updateSmartServiceScore(booking.getPartner(), request.getRating());

        return mapToDto(savedReview);
    }

    public List<ReviewResponseDto> getPartnerReviews(Long partnerId) {
        User partner = userRepository.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("Partner not found."));

        return reviewRepository.findByPartner(partner).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    private void updateSmartServiceScore(User partner, Integer newRating) {
        ServicePartnerProfile profile = partnerProfileRepository.findByUser(partner)
                .orElseThrow(() -> new RuntimeException("Partner profile not found for scoring update."));

        int currentTotal = profile.getTotalReviews();
        double currentScore = profile.getSmartServiceScore();

        // Calculate new moving average
        double newScore = ((currentScore * currentTotal) + newRating) / (currentTotal + 1);

        profile.setSmartServiceScore(Math.round(newScore * 10.0) / 10.0); // Round to 1 decimal place
        profile.setTotalReviews(currentTotal + 1);

        partnerProfileRepository.save(profile);
    }

    private ReviewResponseDto mapToDto(Review review) {
        return ReviewResponseDto.builder()
                .id(review.getId())
                .bookingId(review.getBooking().getId())
                .customerName(review.getCustomer().getFirstName() + " " + review.getCustomer().getLastName())
                .partnerName(review.getPartner().getFirstName() + " " + review.getPartner().getLastName())
                .rating(review.getRating())
                .comment(review.getComment())
                .build();
    }
}
