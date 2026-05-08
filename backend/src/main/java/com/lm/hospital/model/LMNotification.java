package com.lm.hospital.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lm_notifications")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LMNotification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long recipientId; // User ID of the recipient (patient)

    @Column(nullable = false)
    private String recipientName;

    @Column(nullable = false)
    private Long senderId; // User ID of the sender (doctor/admin)

    @Column(nullable = false)
    private String senderName;

    @Column(nullable = false)
    private String title;

    @Column(length = 1000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LMNotificationType type;

    // Optional reference to related entity (appointment, etc.)
    private Long referenceId;

    @Column(name = "is_read", nullable = false)
    private boolean read = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
    }
}
