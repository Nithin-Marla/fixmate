package com.fixmate.repository;

import com.fixmate.entity.Favorite;
import com.fixmate.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    List<Favorite> findByCustomerIdOrderByCreatedAtDesc(Long customerId);
    Optional<Favorite> findByCustomerIdAndPartnerId(Long customerId, Long partnerId);
    boolean existsByCustomerIdAndPartnerId(Long customerId, Long partnerId);
    void deleteByCustomerIdAndPartnerId(Long customerId, Long partnerId);
    long countByPartnerId(Long partnerId);
}
