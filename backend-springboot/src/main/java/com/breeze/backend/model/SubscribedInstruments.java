package com.breeze.backend.model;

import lombok.Data;
import javax.persistence.*;
import java.time.LocalDate;

@Entity
@Table(name = "subscribed_instruments")
@Data
public class SubscribedInstruments {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "exchange_id")
    private Exchanges exchange;

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
