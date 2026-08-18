package com.fixmate.service;

import com.fixmate.dto.KycSubmissionRequest;
import com.fixmate.dto.PartnerLocationRequest;
import com.fixmate.dto.PartnerProfileDto;
import com.fixmate.dto.PartnerProfileRequest;
import com.fixmate.entity.ServicePartnerProfile;
import com.fixmate.entity.User;
import com.fixmate.enums.KycStatus;
import com.fixmate.enums.Role;
import com.fixmate.event.PartnerStatusChangedEvent;
import com.fixmate.repository.ServicePartnerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;


@Service
@RequiredArgsConstructor
public class ServicePartnerService {

    private final ServicePartnerProfileRepository profileRepository;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Development/demo mode auto-approves KYC so freshly registered partners can
     * go online immediately for local demos. In production (false) the admin
     * approval endpoint is the only way to approve.
     */
    @Value("${fixmate.demo-mode:false}")
    private boolean demoMode;

    /**
     * Updates the partner's live location and optionally their online/available
     * status. Called periodically by the partner dashboard while online, and on
     * login/availability toggles.
     */
    public PartnerProfileDto updateLocation(User user, PartnerLocationRequest request) {
        verifyServicePartnerRole(user);

        ServicePartnerProfile profile = profileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Partner profile not found. Create one first."));

        if (request.getLatitude() != null && request.getLongitude() != null) {
            Double lat = request.getLatitude();
            Double lon = request.getLongitude();
            if (lat < -90 || lat > 90) {
                throw new RuntimeException("Invalid latitude: must be between -90 and 90.");
            }
            if (lon < -180 || lon > 180) {
                throw new RuntimeException("Invalid longitude: must be between -180 and 180.");
            }
            profile.setCurrentLatitude(lat);
            profile.setCurrentLongitude(lon);
            profile.setLastLocationUpdate(LocalDateTime.now());
        }

        if (request.getIsOnline() != null) {
            profile.setOnline(request.getIsOnline());
            // Going offline stops the partner from appearing in nearby searches.
            if (!request.getIsOnline()) {
                profile.setAvailable(false);
            }
        }

        if (request.getIsAvailable() != null) {
            if (request.getIsAvailable() && profile.getKycStatus() != KycStatus.APPROVED) {
                throw new RuntimeException("Cannot go available. KYC must be APPROVED first.");
            }
            profile.setAvailable(request.getIsAvailable());
        }

        ServicePartnerProfile savedProfile = profileRepository.save(profile);
        // Notify live nearby streams: status or location changed, so customers
        // watching this search get an updated list without re-searching.
        eventPublisher.publishEvent(new PartnerStatusChangedEvent(user.getId()));
        return mapToDto(savedProfile);
    }

    /**
     * Convenience endpoint for the partner to go ONLINE/OFFLINE or toggle availability.
     */
    public PartnerProfileDto setAvailability(User user, boolean isOnline, boolean isAvailable) {
        return updateLocation(user, PartnerLocationRequest.builder()
                .isOnline(isOnline)
                .isAvailable(isAvailable)
                .build());
    }

    public PartnerProfileDto createOrUpdateProfile(User user, PartnerProfileRequest request) {
        verifyServicePartnerRole(user);

        ServicePartnerProfile profile = profileRepository.findByUser(user)
                .orElse(ServicePartnerProfile.builder()
                        .user(user)
                        .kycStatus(KycStatus.PENDING)
                        .build());

        profile.setExperienceYears(request.getExperienceYears());
        profile.setHourlyRate(request.getHourlyRate());
        profile.setSkills(request.getSkills());
        
        if (request.isAvailable() && profile.getKycStatus() != KycStatus.APPROVED) {
            throw new RuntimeException("Cannot set availability to true. KYC must be APPROVED first.");
        }
        profile.setAvailable(request.isAvailable());

        ServicePartnerProfile savedProfile = profileRepository.save(profile);
        // Skills/availability changed — eligibility for searches may have changed too.
        eventPublisher.publishEvent(new PartnerStatusChangedEvent(user.getId()));
        return mapToDto(savedProfile);
    }

    public PartnerProfileDto getProfile(User user) {
        verifyServicePartnerRole(user);

        ServicePartnerProfile profile = profileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Partner profile not found. Please create one."));
        return mapToDto(profile);
    }

    public PartnerProfileDto submitKyc(User user, KycSubmissionRequest request) {
        verifyServicePartnerRole(user);

        ServicePartnerProfile profile = profileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Partner profile not found. Create profile before KYC."));

        profile.setKycDocumentRef(request.getKycDocumentRef());
        // Resets to pending upon new document submission, unless demo mode is on
        // (local demos need fresh registrations to become eligible immediately).
        profile.setKycStatus(demoMode ? KycStatus.APPROVED : KycStatus.PENDING);

        ServicePartnerProfile savedProfile = profileRepository.save(profile);
        return mapToDto(savedProfile);
    }

    public PartnerProfileDto toggleAvailability(User user, boolean isAvailable) {
        verifyServicePartnerRole(user);

        ServicePartnerProfile profile = profileRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Partner profile not found."));

        if (profile.getKycStatus() != KycStatus.APPROVED && isAvailable) {
            throw new RuntimeException("Cannot set availability to true. KYC must be APPROVED first.");
        }

        profile.setAvailable(isAvailable);
        ServicePartnerProfile savedProfile = profileRepository.save(profile);
        eventPublisher.publishEvent(new PartnerStatusChangedEvent(user.getId()));
        return mapToDto(savedProfile);
    }

    private void verifyServicePartnerRole(User user) {
        if (user.getRole() != Role.ROLE_SERVICE_PARTNER) {
            throw new RuntimeException("Access denied: User is not a Service Partner.");
        }
    }

    private PartnerProfileDto mapToDto(ServicePartnerProfile profile) {
        return PartnerProfileDto.builder()
                .id(profile.getId())
                .experienceYears(profile.getExperienceYears())
                .hourlyRate(profile.getHourlyRate())
                .skills(profile.getSkills())
                .isAvailable(profile.isAvailable())
                .isOnline(profile.isOnline())
                .currentLatitude(profile.getCurrentLatitude())
                .currentLongitude(profile.getCurrentLongitude())
                .lastLocationUpdate(profile.getLastLocationUpdate())
                .kycStatus(profile.getKycStatus())
                .kycDocumentRef(profile.getKycDocumentRef())
                .smartServiceScore(profile.getSmartServiceScore())
                .totalReviews(profile.getTotalReviews())
                .build();
    }
}
