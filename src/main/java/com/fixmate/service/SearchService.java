package com.fixmate.service;

import com.fixmate.dto.PartnerSearchResultDto;
import com.fixmate.entity.ServicePartnerProfile;
import com.fixmate.repository.ServicePartnerProfileRepository;
import com.fixmate.entity.Address;
import com.fixmate.repository.AddressRepository;
import com.fixmate.util.LocationUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final ServicePartnerProfileRepository profileRepository;
    private final AddressRepository addressRepository;

    public List<PartnerSearchResultDto> searchAvailablePartners(String skill) {
        List<ServicePartnerProfile> partners = profileRepository.findAvailablePartnersBySkill(skill);

        return partners.stream().map(profile -> PartnerSearchResultDto.builder()
                .partnerProfileId(profile.getId())
                .userId(profile.getUser().getId())
                .firstName(profile.getUser().getFirstName())
                .lastName(profile.getUser().getLastName())
                .experienceYears(profile.getExperienceYears())
                .hourlyRate(profile.getHourlyRate())
                .skills(profile.getSkills())
                .build()
        ).collect(Collectors.toList());
    }

    public Optional<ServicePartnerProfile> findNearestAvailablePartner(String skill, Address customerAddress) {
        if (customerAddress.getLatitude() == null || customerAddress.getLongitude() == null) {
            throw new RuntimeException("Customer address must have latitude and longitude for emergency matching.");
        }

        List<ServicePartnerProfile> availablePartners = profileRepository.findAvailablePartnersBySkill(skill);

        ServicePartnerProfile nearestPartner = null;
        double minDistance = Double.MAX_VALUE;

        for (ServicePartnerProfile partnerProfile : availablePartners) {
            Optional<Address> partnerAddressOpt = addressRepository.findByUserAndIsDefaultTrue(partnerProfile.getUser());
            
            if (partnerAddressOpt.isPresent()) {
                Address partnerAddress = partnerAddressOpt.get();
                if (partnerAddress.getLatitude() != null && partnerAddress.getLongitude() != null) {
                    double distance = LocationUtils.calculateDistance(
                            customerAddress.getLatitude(), customerAddress.getLongitude(),
                            partnerAddress.getLatitude(), partnerAddress.getLongitude()
                    );

                    // E.g. limit to 25 km radius
                    if (distance < minDistance && distance <= 25.0) {
                        minDistance = distance;
                        nearestPartner = partnerProfile;
                    }
                }
            }
        }

        return Optional.ofNullable(nearestPartner);
    }
}
