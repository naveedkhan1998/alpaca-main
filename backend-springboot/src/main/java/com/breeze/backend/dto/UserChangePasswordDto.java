package com.breeze.backend.dto;

import lombok.Data;

@Data
public class UserChangePasswordDto {
    private String oldPassword;
    private String newPassword;
    private String newPassword2;
}
