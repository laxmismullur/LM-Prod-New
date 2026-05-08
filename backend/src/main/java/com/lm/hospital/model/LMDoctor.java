package com.lm.hospital.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "lm_doctors")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LMDoctor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String doctorCode;

    @NotBlank(message = "Doctor name is required")
    @Pattern(regexp = "^Dr\\.[A-Za-z][A-Za-z\\s.'-]{1,}$", message = "Doctor name must be in this format: Dr.Laxmi")
    @Column(nullable = false)
    private String fullName;

    @NotBlank(message = "Specialization is required")
    @Column(nullable = false)
    private String specialization;

    private String department;
    @NotBlank(message = "Doctor qualification is required")
    @Pattern(regexp = "^MBBS$", message = "Doctor qualification must be MBBS")
    private String qualification;
    @Pattern(regexp = "^(?:\\+91[-\\s]?)?[6-9]\\d{9}$", message = "Use a valid Indian phone number")
    private String phone;

    @Email(message = "Enter a valid email address")
    @Column(unique = true)
    private String email;

    private String experience; // e.g. "5 years"
    private String consultationFee;
    private String availability; // e.g. "Mon-Fri 9AM-5PM"
    private String address;

    @Column(nullable = false)
    private boolean active = true;

    // Linked system user account (optional - doctor may have login)
    private Long userId;
    
    // Username for the doctor's login account (for easy reference)
    private String username;

    @Transient
    private String password;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    public void prePersist() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
