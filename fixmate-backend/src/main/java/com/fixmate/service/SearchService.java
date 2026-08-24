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

        // Calculate FixMate Match Score
        int matchScore = calculateMatchScore(profile, distanceKm, categoryName, totalBookings);
        List<String> matchReasons = buildMatchReasons(profile, distanceKm, categoryName, totalBookings);

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
                .matchScore(matchScore)
                .matchReasons(matchReasons)
                .emergencyAvailable(profile.isAcceptsEmergency())
                .build();
    }

    /**
     * Calculate a 0–100 FixMate Match Score using transparent weighted criteria.
     * Score components:
     *   - Available/online (25 pts)
     *   - Distance proximity (20 pts)
     *   - Rating (20 pts)
     *   - Experience/completed jobs (15 pts)
     *   - KYC verified (10 pts)
     *   - Relevant skill match (10 pts)
     */
    private int calculateMatchScore(ServicePartnerProfile profile, double distanceKm,
                                     String categoryName, long totalBookings) {
        int score = 0;

        // 1. Online/Available (25 pts)
        if (profile.isOnline() && profile.isAvailable()) {
            score += 25;
        } else if (profile.isOnline()) {
            score += 10;
        }

        // 2. Distance proximity (20 pts) — closer = higher score
        if (distanceKm <= 1.0) score += 20;
        else if (distanceKm <= 2.0) score += 16;
        else if (distanceKm <= 5.0) score += 12;
        else if (distanceKm <= 10.0) score += 8;
        else if (distanceKm <= 20.0) score += 4;

        // 3. Rating (20 pts)
        double rating = profile.getSmartServiceScore();
        if (rating >= 4.5) score += 20;
        else if (rating >= 4.0) score += 16;
        else if (rating >= 3.5) score += 12;
        else if (rating >= 3.0) score += 8;
        else if (rating > 0) score += 4;
        // No rating yet = neutral (0 pts)

        // 4. Experience/Completed jobs (15 pts)
        if (totalBookings >= 100) score += 15;
        else if (totalBookings >= 50) score += 12;
        else if (totalBookings >= 20) score += 9;
        else if (totalBookings >= 5) score += 6;
        else if (totalBookings > 0) score += 3;

        // 5. KYC Verified (10 pts)
        if (profile.getKycStatus() == com.fixmate.enums.KycStatus.APPROVED) {
            score += 10;
        }

        // 6. Relevant skill match (10 pts)
        if (profile.getSkills() != null && categoryName != null
                && profile.getSkills().contains(categoryName)) {
            score += 10;
        }

        return Math.min(score, 100);
    }

    private List<String> buildMatchReasons(ServicePartnerProfile profile, double distanceKm,
                                            String categoryName, long totalBookings) {
        List<String> reasons = new java.util.ArrayList<>();

        if (profile.isOnline() && profile.isAvailable()) {
            reasons.add("Available now");
        } else if (profile.isOnline()) {
            reasons.add("Online");
        }

        if (distanceKm <= 1.0) reasons.add("Very close (" + Math.round(distanceKm * 100) / 100.0 + " km)");
        else if (distanceKm <= 5.0) reasons.add("Nearby (" + Math.round(distanceKm * 100) / 100.0 + " km)");

        if (profile.getSmartServiceScore() >= 4.5) reasons.add("Top rated (" + profile.getSmartServiceScore() + "★)");
        else if (profile.getSmartServiceScore() >= 4.0) reasons.add("Highly rated (" + profile.getSmartServiceScore() + "★)");

        if (totalBookings >= 100) reasons.add("100+ completed jobs");
        else if (totalBookings >= 50) reasons.add(totalBookings + " completed jobs");

        if (profile.getKycStatus() == com.fixmate.enums.KycStatus.APPROVED) {
            reasons.add("KYC Verified");
        }

        if (profile.getSkills() != null && categoryName != null
                && profile.getSkills().contains(categoryName)) {
            reasons.add(categoryName + " specialist");
        }

        if (profile.isAcceptsEmergency()) {
            reasons.add("Emergency available");
        }

        return reasons;
    }
}
