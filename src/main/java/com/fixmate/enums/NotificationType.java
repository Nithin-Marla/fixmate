package com.fixmate.enums;

/**
 * Kinds of notifications a user can receive. Kept extensible — booking flow
 * currently uses BOOKING_CREATED / EMERGENCY_REQUEST / status-change types.
 */
public enum NotificationType {
    BOOKING_CREATED,
    BOOKING_ACCEPTED,
    BOOKING_REJECTED,
    BOOKING_CANCELLED,
    BOOKING_REMINDER,
    EMERGENCY_REQUEST
}
