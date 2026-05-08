package com.lm.hospital.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lm_medical_records")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LMMedicalRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private String patientName;

    @Column(nullable = false)
    private Long doctorId;

    @Column(nullable = false)
    private String doctorName;

    private String diagnosis;

    @Column(length = 2000)
    private String prescription;

    @Column(length = 2000)
    private String notes;

    private String labResults;
    private String vitals;

    @Column(name = "record_date")
    private LocalDateTime recordDate;

    private String followUpDate;

    @PrePersist
    public void prePersist() {
        recordDate = LocalDateTime.now();
    }
}
