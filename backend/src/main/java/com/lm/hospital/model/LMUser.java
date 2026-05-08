package com.lm.hospital.model;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "lm_users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LMUser {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false)
    private String email;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private LMRole role;

    private String phone;
    private boolean active = true;
}
