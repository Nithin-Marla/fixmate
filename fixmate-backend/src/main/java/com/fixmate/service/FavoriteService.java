package com.fixmate.service;

import com.fixmate.dto.FavoriteDto;
import com.fixmate.entity.Favorite;
import com.fixmate.entity.ServicePartnerProfile;
import com.fixmate.entity.User;
import com.fixmate.enums.BookingStatus;
import com.fixmate.enums.Role;
import com.fixmate.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FavoriteService {

    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final ServicePartnerProfileRepository partnerProfileRepository;
    private final BookingRepository bookingRepository;

    public FavoriteDto addFavorite(User customer, Long partnerId) {
        if (customer.getRole() != Role.ROLE_CUSTOMER) {
            throw new RuntimeException("Only customers can add favorites.");
        }

        User partner = userRepository.findById(partnerId)
                .orElseThrow(() -> new RuntimeException("Partner not found."));

        if (partner.getRole() != Role.ROLE_SERVICE_PARTNER) {
            throw new RuntimeException("Selected user is not a service partner.");
        }

        if (favoriteRepository.existsByCustomerIdAndPartnerId(customer.getId(), partnerId)) {
            throw new RuntimeException("Partner is already in your favorites.");
        }

        Favorite fav = Favorite.builder()
                .customer(customer)
                .partner(partner)
                .build();

        favoriteRepository.save(fav);
        return mapToDto(fav, customer);
    }

    public void removeFavorite(User customer, Long partnerId) {
        if (customer.getRole() != Role.ROLE_CUSTOMER) {
            throw new RuntimeException("Only customers can manage favorites.");
        }
        favoriteRepository.deleteByCustomerIdAndPartnerId(customer.getId(), partnerId);
    }

    public List<FavoriteDto> getFavorites(User customer) {
        if (customer.getRole() != Role.ROLE_CUSTOMER) {
            throw new RuntimeException("Only customers can view favorites.");
        }
        return favoriteRepository.findByCustomerIdOrderByCreatedAtDesc(customer.getId()).stream()
                .map(fav -> mapToDto(fav, customer))
                .collect(Collectors.toList());
    }

    public boolean isFavorite(User customer, Long partnerId) {
        if (customer == null) return false;
        return favoriteRepository.existsByCustomerIdAndPartnerId(customer.getId(), partnerId);
    }

    private FavoriteDto mapToDto(Favorite fav, User customer) {
        User partner = fav.getPartner();
        ServicePartnerProfile profile = partnerProfileRepository.findByUser(partner).orElse(null);

        return FavoriteDto.builder()
                .id(fav.getId())
                .partnerId(partner.getId())
                .partnerName(partner.getFirstName() + " " + partner.getLastName())
                .serviceCategory(profile != null && profile.getSkills() != null && !profile.getSkills().isEmpty()
                        ? profile.getSkills().get(0) : "")
                .averageRating(profile != null ? profile.getSmartServiceScore() : null)
                .totalBookings(profile != null ? (int) bookingRepository.countByPartnerAndStatus(partner, BookingStatus.COMPLETED) : 0)
                .isOnline(profile != null && profile.isOnline())
                .isAvailable(profile != null && profile.isAvailable())
                .createdAt(fav.getCreatedAt())
                .build();
    }
}
