package com.fixmate.controller;

import com.fixmate.dto.NotificationDto;
import com.fixmate.entity.User;
import com.fixmate.response.ApiResponse;
import com.fixmate.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /** Only the authenticated user's own notifications, newest first. */
    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDto>>> getUserNotifications(
            @AuthenticationPrincipal User user
    ) {
        List<NotificationDto> notifications = notificationService.getUserNotifications(user);
        return ResponseEntity.ok(ApiResponse.success("Notifications fetched successfully", notifications));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount(
            @AuthenticationPrincipal User user
    ) {
        long count = notificationService.getUnreadCount(user);
        return ResponseEntity.ok(ApiResponse.success("Unread count fetched successfully", Map.of("count", count)));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<ApiResponse<String>> markAsRead(
            @PathVariable Long id,
            @AuthenticationPrincipal User user
    ) {
        notificationService.markAsRead(id, user);
        return ResponseEntity.ok(ApiResponse.success("Notification marked as read", null));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ApiResponse<String>> markAllAsRead(
            @AuthenticationPrincipal User user
    ) {
        int updated = notificationService.markAllAsRead(user);
        return ResponseEntity.ok(ApiResponse.success("All notifications marked as read", null));
    }
}
