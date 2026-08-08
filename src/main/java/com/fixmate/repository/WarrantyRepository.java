package com.fixmate.repository;

import com.fixmate.entity.User;
import com.fixmate.entity.Warranty;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WarrantyRepository extends JpaRepository<Warranty, Long> {
    List<Warranty> findByCustomer(User customer);
}
