package com.fixmate.repository;

import com.fixmate.entity.ServicePartnerProfile;
import com.fixmate.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.fixmate.enums.KycStatus;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServicePartnerProfileRepository extends JpaRepository<ServicePartnerProfile, Long> {
    Optional<ServicePartnerProfile> findByUser(User user);

    @Query("SELECT p FROM ServicePartnerProfile p JOIN p.skills s WHERE s = :skill AND p.isAvailable = true AND p.kycStatus = 'APPROVED'")
    List<ServicePartnerProfile> findAvailablePartnersBySkill(@Param("skill") String skill);

    long countByKycStatus(KycStatus status);
}
