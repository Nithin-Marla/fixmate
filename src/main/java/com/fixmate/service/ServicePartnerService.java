package com.fixmate.service;

import com.fixmate.dto.KycSubmissionRequest;
import com.fixmate.dto.PartnerProfileDto;
import com.fixmate.dto.PartnerProfileRequest;
import com.fixmate.entity.ServicePartnerProfile;
import com.fixmate.entity.User;
import com.fixmate.enums.KycStatus;
import com.fixmate.enums.Role;
import com.fixmate.repository.ServicePartnerProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;


@Service
@RequiredArgsConstructor
public class ServicePartnerService {

    private final ServicePartnerProfileRepository profileRepository;

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
        profile.setKycStatus(KycStatus.PENDING); // Resets to pending upon new document submission

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
                .kycStatus(profile.getKycStatus())
                .kycDocumentRef(profile.getKycDocumentRef())
                .smartServiceScore(profile.getSmartServiceScore())
                .totalReviews(profile.getTotalReviews())
                .build();
    }
}
