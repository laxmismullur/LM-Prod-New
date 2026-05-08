package com.lm.hospital.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lm_appointments")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LMAppointment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // Patient reference
    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private String patientName;

    // Doctor reference — now links to lm_doctors table
    @Column(nullable = false)
    private Long doctorId;

    @Column(nullable = false)
    private String doctorName;

    private String doctorCode;
    private String department;
    private String specialization;

    @Column(nullable = false)
    private LocalDateTime appointmentDate;

    private String reason;
    private String notes;

    // Doctor's notes after visit
    private String doctorNotes;

    @Enumerated(EnumType.STRING)
    private LMAppointmentStatus status;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = LMAppointmentStatus.SCHEDULED;
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
