package com.fixmate.repository;

import com.fixmate.entity.ServicePartnerProfile;
import com.fixmate.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.fixmate.enums.KycStatus;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ServicePartnerProfileRepository extends JpaRepository<ServicePartnerProfile, Long> {
    Optional<ServicePartnerProfile> findByUser(User user);

    @Query("SELECT p FROM ServicePartnerProfile p JOIN p.skills s WHERE LOWER(TRIM(s)) = LOWER(TRIM(:skill)) AND p.isAvailable = true AND p.kycStatus = 'APPROVED'")
    List<ServicePartnerProfile> findAvailablePartnersBySkill(@Param("skill") String skill);

    @Query("SELECT DISTINCT p FROM ServicePartnerProfile p JOIN p.skills s " +
            "WHERE LOWER(TRIM(s)) = LOWER(TRIM(:skill)) " +
            "AND p.kycStatus = 'APPROVED' " +
            "AND p.isOnline = true " +
            "AND p.isAvailable = true " +
            "AND p.currentLatitude IS NOT NULL " +
            "AND p.currentLongitude IS NOT NULL " +
            "AND p.lastLocationUpdate IS NOT NULL " +
            "AND p.lastLocationUpdate >= :staleAfter")
    List<ServicePartnerProfile> findEligibleNearbyPartnersBySkill(@Param("skill") String skill,
                                                                  @Param("staleAfter") LocalDateTime staleAfter);

    long countByKycStatus(KycStatus status);
    List<ServicePartnerProfile> findByKycStatus(KycStatus status);
}
