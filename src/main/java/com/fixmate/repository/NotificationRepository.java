package com.fixmate.repository;

import com.fixmate.entity.Notification;
import com.fixmate.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, Long> {
    List<Notification> findByUserOrderByCreatedAtDesc(User user);

    long countByUserAndIsReadFalse(User user);

    @Modifying
    @Query("update Notification n set n.isRead = true where n.user = :user and n.isRead = false")
    int markAllAsRead(@Param("user") User user);
}
