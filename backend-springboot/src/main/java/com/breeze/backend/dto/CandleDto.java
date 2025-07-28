package com.breeze.backend.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class CandleDto {
    private double open;
    private double high;
    private double low;
    private double close;
    private Double volume;
    private LocalDateTime date;
}
