package com.fixmate.service;

import com.fixmate.dto.NearbyPartnerDto;
import com.fixmate.dto.PartnerSearchResultDto;
import com.fixmate.entity.ServiceCategory;
import com.fixmate.entity.ServicePartnerProfile;
import com.fixmate.enums.BookingStatus;
import com.fixmate.repository.BookingRepository;
import com.fixmate.repository.ServiceCategoryRepository;
import com.fixmate.repository.ServicePartnerProfileRepository;
import com.fixmate.util.LocationUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SearchService {

    private final ServicePartnerProfileRepository profileRepository;
    private final ServiceCategoryRepository categoryRepository;
    private final BookingRepository bookingRepository;

    @Value("${fixmate.nearby-search.initial-radius-km:5}")
    private double initialRadiusKm;

    @Value("${fixmate.nearby-search.max-radius-km:50}")
    private double maxRadiusKm;

    @Value("${fixmate.nearby-search.stale-location-minutes:15}")
    private int staleLocationMinutes;

    private record Candidate(ServicePartnerProfile partner, double distanceKm) {}

    /**
     * Result of a nearby search. Alongside the matched partners it carries
     * diagnostics the UI can use when nothing is found: how far the closest
     * eligible partner actually is (even when beyond the radius), the radius
     * that was searched, and the category name.
     */
    public record NearbySearchResult(List<NearbyPartnerDto> partners, Double nearestDistanceKm,
                                     double searchedRadiusKm, String categoryName) {

        public boolean isEmpty() {
            return partners.isEmpty();
        }

        /**
         * Explains WHY the list is empty, so the customer isn't left guessing:
         * either no partner is eligible at all (offline / not KYC / wrong skill),
         * or partners exist but are simply too far away.
         */
        public String emptyMessage() {
            if (nearestDistanceKm == null) {
                return "No available " + categoryName + " partners found right now. "
                        + "Partners must be online, marked available, KYC-approved, and offer this category.";
            }
            return "No " + categoryName + " partners found within " + Math.round(searchedRadiusKm)
                    + " km. The closest eligible partner is "
                    + (Math.round(nearestDistanceKm * 10.0) / 10.0) + " km away — try a location closer to them.";
        }
    }

    /**
     * Legacy skill-only search (kept for API compatibility). The frontend now
     * uses {@link #findNearbyPartners} for location-aware discovery.
     */
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

    /**
     * Real-time nearby discovery pipeline:
     * customer location + category -> eligible active partners -> distance ->
     * sort by nearest -> filter within radius (expanding if empty).
     */
    public NearbySearchResult findNearbyPartners(Long categoryId, Double latitude, Double longitude, Double requestedRadiusKm) {
        if (latitude == null || longitude == null) {
            throw new RuntimeException("Customer location is required for nearby partner search.");
        }

        ServiceCategory category = categoryRepository.findById(categoryId)
                .orElseThrow(() -> new RuntimeException("Service category not found."));

        List<Candidate> candidates = profileRepository.findEligibleNearbyPartnersBySkill(
                        category.getName(), LocalDateTime.now().minusMinutes(staleLocationMinutes))
                .stream()
                .map(p -> new Candidate(p, LocationUtils.calculateDistance(
                        latitude, longitude, p.getCurrentLatitude(), p.getCurrentLongitude())))
                .sorted(Comparator.comparingDouble(Candidate::distanceKm))
                .collect(Collectors.toList());

        // Distance to the closest eligible partner, even when they are outside
        // the search radius — used to explain empty results to the customer.
        Double nearestDistanceKm = candidates.isEmpty() ? null : candidates.get(0).distanceKm();

        // Start from the configured (or requested) radius and expand gradually.
        double radius = (requestedRadiusKm != null && requestedRadiusKm > 0) ? requestedRadiusKm : initialRadiusKm;
        double maxRadius = Math.max(radius, maxRadiusKm);

        List<Candidate> withinRadius = List.of();
        while (radius <= maxRadius) {
            final double currentRadius = radius;
            withinRadius = candidates.stream()
                    .filter(c -> c.distanceKm() <= currentRadius)
                    .collect(Collectors.toList());
            if (!withinRadius.isEmpty()) {
                break;
            }
            radius *= 2;
        }

        List<NearbyPartnerDto> partners = withinRadius.stream()
                .map(c -> mapToNearbyDto(c.partner(), c.distanceKm(), category.getName()))
                .collect(Collectors.toList());

        return new NearbySearchResult(partners, nearestDistanceKm, radius, category.getName());
    }

    /**
     * Finds the single nearest currently-active partner for emergency/instant
     * bookings, using the partner's LIVE location (not their registered address).
     */
    public Optional<ServicePartnerProfile> findNearestActivePartner(String skill, double latitude, double longitude, double maxRadiusKm) {
        return profileRepository.findEligibleNearbyPartnersBySkill(
                        skill, LocalDateTime.now().minusMinutes(staleLocationMinutes))
                .stream()
                .map(p -> new Candidate(p, LocationUtils.calculateDistance(
                        latitude, longitude, p.getCurrentLatitude(), p.getCurrentLongitude())))
                .filter(c -> c.distanceKm() <= maxRadiusKm)
                .min(Comparator.comparingDouble(Candidate::distanceKm))
                .map(Candidate::partner);
    }

    private NearbyPartnerDto mapToNearbyDto(ServicePartnerProfile profile, double distanceKm, String categoryName) {
        long totalBookings = bookingRepository.countByPartnerAndStatus(
                profile.getUser(), BookingStatus.COMPLETED);

        return NearbyPartnerDto.builder()
                .partnerProfileId(profile.getId())
                .userId(profile.getUser().getId())
                .firstName(profile.getUser().getFirstName())
                .lastName(profile.getUser().getLastName())
                .experienceYears(profile.getExperienceYears())
                .hourlyRate(profile.getHourlyRate())
                .skills(profile.getSkills())
                .smartServiceScore(profile.getSmartServiceScore())
                .distanceKm(Math.round(distanceKm * 100.0) / 100.0)
                .serviceCategory(categoryName)
                .available(profile.isAvailable())
                .active(profile.isOnline())
                .kycStatus(profile.getKycStatus().name())
                .totalBookings(totalBookings)
                .lastLocationUpdate(profile.getLastLocationUpdate())
                .build();
    }
}
