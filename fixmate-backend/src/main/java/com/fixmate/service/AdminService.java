package com.fixmate.service;

import com.fixmate.dto.*;
import com.fixmate.entity.ServicePartnerProfile;
import com.fixmate.entity.User;
import com.fixmate.enums.BookingStatus;
import com.fixmate.enums.KycStatus;
import com.fixmate.enums.Role;
import com.fixmate.repository.BookingRepository;
import com.fixmate.repository.ServicePartnerProfileRepository;
import com.fixmate.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final ServicePartnerProfileRepository partnerProfileRepository;
    private final AuditLogService auditLogService;

    public AdminDashboardDto getDashboardAnalytics(User admin) {
        if (admin.getRole() != Role.ROLE_ADMIN) {
            throw new RuntimeException("Access Denied: Only administrators can view the dashboard.");
        }

        long totalCustomers = userRepository.countByRole(Role.ROLE_CUSTOMER);
        long totalServicePartners = userRepository.countByRole(Role.ROLE_SERVICE_PARTNER);
        long pendingKycApprovals = partnerProfileRepository.countByKycStatus(KycStatus.PENDING);

        long totalBookings = bookingRepository.count();
        long completedBookings = bookingRepository.countByStatus(BookingStatus.COMPLETED);
        long emergencyBookings = bookingRepository.countByIsEmergencyTrue();

        Double totalRevenue = bookingRepository.sumTotalAmountByStatus(BookingStatus.COMPLETED);
        if (totalRevenue == null) totalRevenue = 0.0;

        return AdminDashboardDto.builder()
                .totalCustomers(totalCustomers)
                .totalServicePartners(totalServicePartners)
                .pendingKycApprovals(pendingKycApprovals)
                .totalBookings(totalBookings)
                .completedBookings(completedBookings)
                .emergencyBookings(emergencyBookings)
                .totalRevenue(totalRevenue)
                .build();
    }

    public PartnerProfileDto reviewKyc(User admin, Long profileId, KycStatus status) {
        if (admin.getRole() != Role.ROLE_ADMIN) {
            throw new RuntimeException("Access Denied: Only administrators can review KYC.");
        }
        if (status != KycStatus.APPROVED && status != KycStatus.REJECTED) {
            throw new RuntimeException("Invalid KYC review status. Use APPROVED or REJECTED.");
        }

        ServicePartnerProfile profile = partnerProfileRepository.findById(profileId)
                .orElseThrow(() -> new RuntimeException("Partner profile not found."));

        profile.setKycStatus(status);
        if (status == KycStatus.REJECTED) {
            profile.setAvailable(false);
            profile.setOnline(false);
            profile.setCurrentLatitude(null);
            profile.setCurrentLongitude(null);
        }

        ServicePartnerProfile saved = partnerProfileRepository.save(profile);

        auditLogService.log("KYC_REVIEWED", "PartnerProfile", saved.getId(),
                "KYC " + status.name() + " for " + saved.getUser().getFirstName()
                        + " " + saved.getUser().getLastName(),
                admin);

        return PartnerProfileDto.builder()
                .id(saved.getId())
                .experienceYears(saved.getExperienceYears())
                .hourlyRate(saved.getHourlyRate())
                .skills(saved.getSkills())
                .isAvailable(saved.isAvailable())
                .isOnline(saved.isOnline())
                .currentLatitude(saved.getCurrentLatitude())
                .currentLongitude(saved.getCurrentLongitude())
                .lastLocationUpdate(saved.getLastLocationUpdate())
                .kycStatus(saved.getKycStatus())
                .kycDocumentRef(saved.getKycDocumentRef())
                .smartServiceScore(saved.getSmartServiceScore())
                .totalReviews(saved.getTotalReviews())
                .build();
    }

    /**
     * List all customers for admin management.
     */
    public List<AdminUserDto> listCustomers() {
        return userRepository.findByRole(Role.ROLE_CUSTOMER).stream()
                .map(this::mapToUserDto)
                .collect(Collectors.toList());
    }

    /**
     * List all service partners for admin management.
     */
    public List<AdminUserDto> listPartners() {
        return userRepository.findByRole(Role.ROLE_SERVICE_PARTNER).stream()
                .map(this::mapToUserDto)
                .collect(Collectors.toList());
    }

    /**
     * List all pending KYC submissions for admin review.
     */
    public List<AdminUserDto> listPendingKyc() {
        return partnerProfileRepository.findByKycStatus(KycStatus.PENDING).stream()
                .map(profile -> mapToUserDto(profile.getUser()))
                .collect(Collectors.toList());
    }

    /**
     * List all bookings for admin management.
     */
    public List<AdminBookingDto> listBookings() {
        return bookingRepository.findAll().stream()
                .map(booking -> AdminBookingDto.builder()
                        .id(booking.getId())
                        .customerName(booking.getCustomer().getFirstName() + " " + booking.getCustomer().getLastName())
                        .customerId(booking.getCustomer().getId())
                        .partnerName(booking.getPartner().getFirstName() + " " + booking.getPartner().getLastName())
                        .partnerId(booking.getPartner().getId())
                        .categoryName(booking.getCategory().getName())
                        .status(booking.getStatus().name())
                        .totalAmount(booking.getTotalAmount())
                        .isEmergency(booking.isEmergency())
                        .scheduledDate(booking.getScheduledDate())
                        .createdAt(booking.getCreatedAt())
                        .completedAt(booking.getCompletedAt())
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * Get recent audit logs.
     */
    public List<com.fixmate.entity.AuditLog> getAuditLogs(int page, int size) {
        return auditLogService.getRecentLogs(page, size).getContent();
    }

    private AdminUserDto mapToUserDto(User user) {
        AdminUserDto.AdminUserDtoBuilder b = AdminUserDto.builder()
                .id(user.getId())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .role(user.getRole().name())
                .createdAt(null); // User entity doesn't have createdAt yet

        // For partners, add KYC and profile info
        if (user.getRole() == Role.ROLE_SERVICE_PARTNER) {
            var profile = partnerProfileRepository.findByUser(user);
            if (profile.isPresent()) {
                b.kycStatus(profile.get().getKycStatus().name())
                  .isOnline(profile.get().isOnline())
                  .averageRating(profile.get().getSmartServiceScore());
            }
        }

        return b.build();
    }
}
