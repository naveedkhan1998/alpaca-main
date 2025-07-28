package com.breeze.backend.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class InstrumentDto {
    private Long id;
    private Long exchangeId;
    private String stockToken;
    private String token;
    private String instrument;
    private String shortName;
    private String series;
    private String companyName;
    private LocalDate expiry;
    private Double strikePrice;
    private String optionType;
    private String exchangeCode;
}
