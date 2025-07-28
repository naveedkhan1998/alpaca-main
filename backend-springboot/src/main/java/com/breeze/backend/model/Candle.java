package com.breeze.backend.model;

import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "candles")
@Data
public class Candle {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "instrument_id")
    private SubscribedInstruments instrument;

    private double open;

    private double high;

    private double low;

    private double close;

    private Double volume;

    private LocalDateTime date;

    private boolean isActive = true;
}
