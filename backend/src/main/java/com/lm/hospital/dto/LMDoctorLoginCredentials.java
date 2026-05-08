package com.lm.hospital.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LMDoctorLoginCredentials {
    private Long doctorId;
    private String doctorName;
    private String username;
    private String tempPassword;
    private String message;
}
