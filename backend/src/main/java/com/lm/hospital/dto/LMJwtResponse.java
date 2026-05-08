package com.lm.hospital.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LMJwtResponse {
    private String token;
    private String type = "Bearer";
    private Long id;
    private String username;
    private String fullName;
    private String email;
    private String role;

    public LMJwtResponse(String token, Long id, String username, String fullName, String email, String role) {
        this.token = token;
        this.id = id;
        this.username = username;
        this.fullName = fullName;
        this.email = email;
        this.role = role;
    }
}
