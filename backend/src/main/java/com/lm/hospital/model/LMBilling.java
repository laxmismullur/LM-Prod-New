package com.lm.hospital.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;
import java.math.BigDecimal;

@Entity
@Table(name = "lm_billing")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LMBilling {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String invoiceNumber;

    @Column(nullable = false)
    private Long patientId;

    @Column(nullable = false)
    private String patientName;

    private String services;
    private BigDecimal consultationFee;
    private BigDecimal medicationCost;
    private BigDecimal labCost;
    private BigDecimal roomCharge;
    private BigDecimal totalAmount;
    private BigDecimal paidAmount;
    private BigDecimal discount;

    @Enumerated(EnumType.STRING)
    private LMPaymentStatus paymentStatus;

    private String paymentMethod;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        if (paymentStatus == null) paymentStatus = LMPaymentStatus.PENDING;
    }
}
