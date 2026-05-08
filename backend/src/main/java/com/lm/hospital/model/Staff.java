package com.lm.hospital.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Staff {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank(message = "Full name is required")
    @Pattern(regexp = "^[A-Za-z][A-Za-z\\s.'-]{2,}$", message = "Name must contain only letters and be at least 3 characters")
    private String fullName;

    @NotBlank(message = "Username is required")
    private String username;

    @Email(message = "Enter a valid email address")
    private String email;

    private String password;

    @Pattern(regexp = "^(NURSE|RECEPTIONIST)$", message = "Role must be NURSE or RECEPTIONIST")
    private String role; // NURSE / RECEPTIONIST

    @Pattern(regexp = "^(?:\\+91[-\\s]?)?[6-9]\\d{9}$", message = "Use a valid Indian phone number")
    private String phone;
    private String specialization;
    private String department;

    private boolean active;
}
