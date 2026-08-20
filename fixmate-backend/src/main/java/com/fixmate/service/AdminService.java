package com.fixmate.service;

import com.fixmate.dto.AdminDashboardDto;
import com.fixmate.dto.PartnerProfileDto;
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

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    private final ServicePartnerProfileRepository partnerProfileRepository;

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
        if (totalRevenue == null) {
            totalRevenue = 0.0;
        }

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

    /**
     * Production KYC review path: an admin approves or rejects a partner's KYC
     * submission. In demo mode KYC auto-approves instead, but this endpoint
     * remains the source of truth once {@code fixmate.demo-mode=false}.
     */
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
}
