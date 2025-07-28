package com.breeze.backend.model;

import lombok.Data;
import javax.persistence.*;

@Entity
@Table(name = "percentages")
@Data
public class Percentage {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String source;

    private Double value;
}
