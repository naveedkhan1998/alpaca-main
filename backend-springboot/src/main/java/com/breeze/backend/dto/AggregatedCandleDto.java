package com.breeze.backend.dto;

import lombok.Data;

@Data
public class AggregatedCandleDto {
    private String date;
    private double open;
    private double high;
    private double low;
    private double close;
    private Double volume;
}
