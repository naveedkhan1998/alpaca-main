package com.breeze.backend.dto;

import lombok.Data;

@Data
public class UserPasswordResetDto {
    private String newPassword;
    private String newPassword2;
}
