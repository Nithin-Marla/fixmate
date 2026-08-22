package com.fixmate.service;

import com.fixmate.dto.PartnerEarningsDto;
import com.fixmate.entity.Booking;
import com.fixmate.entity.Payment;
import com.fixmate.entity.User;
import com.fixmate.enums.BookingStatus;
import com.fixmate.enums.PaymentStatus;
import com.fixmate.enums.Role;
import com.fixmate.repository.BookingRepository;
import com.fixmate.repository.PaymentRepository;
import com.fixmate.repository.ServicePartnerProfileRepository;
import com.fixmate.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PartnerEarningsService {

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final ReviewRepository reviewRepository;
    private final ServicePartnerProfileRepository partnerProfileRepository;

    public PartnerEarningsDto getEarnings(User partner) {
        if (partner.getRole() != Role.ROLE_SERVICE_PARTNER) {
            throw new RuntimeException("Only service partners can view earnings.");
        }

        Double totalEarnings = paymentRepository.sumEarningsByPartner(partner);
        Double platformFees = paymentRepository.sumPlatformFeeByPartner(partner);
        long completedBookings = bookingRepository.countByPartnerAndStatus(partner, BookingStatus.COMPLETED);

        // Count unique customers served
        long totalCustomers = bookingRepository.findByPartner(partner).stream()
                .filter(b -> b.getStatus() == BookingStatus.COMPLETED)
                .map(b -> b.getCustomer().getId())
                .distinct()
                .count();

        // Get average rating
        Double avgRating = partnerProfileRepository.findByUser(partner)
                .map(p -> p.getSmartServiceScore())
                .orElse(0.0);

        // Last 7 days daily earnings
        List<PartnerEarningsDto.DailyEarningDto> dailyEarnings = new ArrayList<>();
        LocalDate today = LocalDate.now();
        for (int i = 6; i >= 0; i--) {
            LocalDate day = today.minusDays(i);
            LocalDateTime dayStart = day.atStartOfDay();
            LocalDateTime dayEnd = day.atTime(LocalTime.MAX);

            List<Booking> dayBookings = bookingRepository.findByPartner(partner).stream()
                    .filter(b -> b.getStatus() == BookingStatus.COMPLETED)
                    .filter(b -> b.getCompletedAt() != null
                            && b.getCompletedAt().isAfter(dayStart) && b.getCompletedAt().isBefore(dayEnd))
                    .toList();

            double dayEarnings = 0;
            for (Booking b : dayBookings) {
                var payment = paymentRepository.findByBookingId(b.getId());
                if (payment.isPresent() && payment.get().getStatus() == PaymentStatus.SUCCESS) {
                    dayEarnings += payment.get().getTotalAmount() != null
                            ? payment.get().getTotalAmount().doubleValue() : 0;
                }
            }

            dailyEarnings.add(PartnerEarningsDto.DailyEarningDto.builder()
                    .date(day.format(DateTimeFormatter.ofPattern("MMM dd")))
                    .earnings(dayEarnings)
                    .bookingCount((long) dayBookings.size())
                    .build());
        }

        return PartnerEarningsDto.builder()
                .totalEarnings(totalEarnings != null ? totalEarnings : 0.0)
                .platformFees(platformFees != null ? platformFees : 0.0)
                .netEarnings((totalEarnings != null ? totalEarnings : 0.0) - (platformFees != null ? platformFees : 0.0))
                .totalCompletedBookings(completedBookings)
                .totalCustomersServed(totalCustomers)
                .averageRating(avgRating)
                .recentDailyEarnings(dailyEarnings)
                .build();
    }
}
