package com.breeze.backend.model;

import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "ticks")
@Data
public class Tick {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "instrument_id")
    private SubscribedInstruments instrument;

    private Double ltp;

    private Double ltq;

    private LocalDateTime date;

    private boolean used = false;
}
