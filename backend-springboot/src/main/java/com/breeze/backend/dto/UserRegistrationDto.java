package com.breeze.backend.dto;

import lombok.Data;

@Data
public class UserRegistrationDto {
    private String email;
    private String name;
    private String password;
    private String password2;
    private boolean tc;
    private String authProvider;
}
