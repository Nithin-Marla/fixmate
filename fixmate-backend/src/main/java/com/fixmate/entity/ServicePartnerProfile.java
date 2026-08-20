package com.fixmate.entity;

import com.fixmate.enums.KycStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "partner_profiles")
public class ServicePartnerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    private Integer experienceYears;
    private Double hourlyRate;

    private String kycDocumentRef;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private KycStatus kycStatus = KycStatus.PENDING;

    @ElementCollection
    @CollectionTable(name = "partner_skills", joinColumns = @JoinColumn(name = "profile_id"))
    @Column(name = "skill")
    private List<String> skills;

    @Builder.Default
    @Column(nullable = false)
    private boolean isAvailable = false;

    /** Whether the partner is currently online / active on the app. */
    @Builder.Default
    @Column(nullable = false)
    private boolean isOnline = false;

    /** Partner's live latitude (updated periodically while online). */
    private Double currentLatitude;

    /** Partner's live longitude (updated periodically while online). */
    private Double currentLongitude;

    /** When the partner's live location was last updated. */
    private LocalDateTime lastLocationUpdate;

    @Builder.Default
    @Column(nullable = false)
    private Double smartServiceScore = 0.0;

    @Builder.Default
    @Column(nullable = false)
    private Integer totalReviews = 0;
}
