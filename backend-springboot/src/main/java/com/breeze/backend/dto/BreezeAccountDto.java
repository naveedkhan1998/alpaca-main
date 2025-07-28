package com.breeze.backend.dto;

import lombok.Data;

@Data
public class BreezeAccountDto {
    private Long id;
    private Long userId;
    private String name;
    private String apiKey;
    private String apiSecret;
    private String sessionToken;
    private boolean isActive;
}
