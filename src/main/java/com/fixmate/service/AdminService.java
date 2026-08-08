package com.fixmate.service;

import com.fixmate.dto.AdminDashboardDto;
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
}
