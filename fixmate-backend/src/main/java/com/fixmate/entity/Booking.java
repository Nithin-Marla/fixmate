package com.fixmate.entity;

import com.fixmate.enums.BookingStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "bookings")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id", nullable = false)
    private User partner;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id", nullable = false)
    private ServiceCategory category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "address_id", nullable = false)
    private Address address;

    @Column(nullable = false)
    private LocalDateTime scheduledDate;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private BookingStatus status = BookingStatus.PENDING;

    private Double totalAmount;

    @Builder.Default
    @Column(nullable = false)
    private boolean isEmergency = false;

    /** Customer's live latitude at the time of booking. */
    private Double customerLatitude;

    /** Customer's live longitude at the time of booking. */
    private Double customerLongitude;

    /** Partner's live latitude at the time of booking. */
    private Double partnerLatitude;

    /** Partner's live longitude at the time of booking. */
    private Double partnerLongitude;

    @Column(length = 1000)
    private String notes;

    /** Reason for cancellation when status = CANCELLED */
    @Column(length = 500)
    private String cancellationReason;

    /** When the booking was actually completed */
    private LocalDateTime completedAt;

    /** When the booking status was last updated */
    private LocalDateTime statusUpdatedAt;

    @Builder.Default
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (statusUpdatedAt == null) statusUpdatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        statusUpdatedAt = LocalDateTime.now();
        if (status == BookingStatus.COMPLETED && completedAt == null) {
            completedAt = LocalDateTime.now();
        }
    }
}
