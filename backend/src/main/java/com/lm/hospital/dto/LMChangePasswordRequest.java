package com.lm.hospital.dto;

import lombok.Data;

@Data
public class LMChangePasswordRequest {
    private String oldPassword;
    private String newPassword;
    private String confirmPassword;
}
