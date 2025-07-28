package com.breeze.backend.model;

import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "breeze_accounts")
@Data
public class BreezeAccount {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

    private String name = "ADMIN";

    private String apiKey = " ";

    private String apiSecret = " ";

    private String sessionToken;

    @Column(name = "last_updated")
    private LocalDateTime lastUpdated = LocalDateTime.now();

    private boolean isActive = true;
}
