package com.fixmate.service;

import com.fixmate.dto.NotificationDto;
import com.fixmate.entity.Notification;
import com.fixmate.entity.User;
import com.fixmate.enums.NotificationType;
import com.fixmate.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final EmailService emailService;

    /**
     * Persists an in-app notification for the given user and best-effort emails
     * them. All notification creation should go through here so the storage and
     * (future) real-time dispatch stay in one place — swapping polling for
     * WebSocket/SSE later only touches this service.
     */
    public NotificationDto sendNotification(User user, NotificationType type, String title,
                                            String message, Long bookingId) {
        Notification notification = Notification.builder()
                .user(user)
                .type(type)
                .title(title)
                .message(message)
                .bookingId(bookingId)
                .isRead(false)
                .build();
        Notification saved = notificationRepository.save(notification);

        emailService.sendEmail(user.getEmail(), title, message);

        return mapToDto(saved);
    }

    public List<NotificationDto> getUserNotifications(User user) {
        return notificationRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    public long getUnreadCount(User user) {
        return notificationRepository.countByUserAndIsReadFalse(user);
    }

    public void markAsRead(Long notificationId, User user) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found."));

        if (!notification.getUser().getId().equals(user.getId())) {
            throw new RuntimeException("You can only read your own notifications.");
        }

        notification.setRead(true);
        notificationRepository.save(notification);
    }

    @Transactional
    public int markAllAsRead(User user) {
        return notificationRepository.markAllAsRead(user);
    }

    private NotificationDto mapToDto(Notification notification) {
        return NotificationDto.builder()
                .id(notification.getId())
                .type(notification.getType())
                .title(notification.getTitle())
                .message(notification.getMessage())
                .bookingId(notification.getBookingId())
                .isRead(notification.isRead())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
