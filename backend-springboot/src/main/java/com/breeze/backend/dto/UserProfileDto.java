package com.breeze.backend.dto;

import lombok.Data;

@Data
public class UserProfileDto {
    private Long id;
    private String email;
    private String name;
    private String avatar;
    private boolean isAdmin;
    private String authProvider;
}
