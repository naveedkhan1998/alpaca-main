package com.breeze.backend.model;

import lombok.Data;
import javax.persistence.*;

@Entity
@Table(name = "percentage_instrument")
@Data
public class PercentageInstrument {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "instrument_id")
    private SubscribedInstruments instrument;

    private double percentage = 0.0;

    private boolean isLoading = false;
}
