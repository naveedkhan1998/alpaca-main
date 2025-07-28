package com.breeze.backend.model;

import lombok.Data;
import javax.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String email;

    private String name;

    private String password;

    private String avatar;

    private boolean tc;

    private boolean isActive = true;

    private boolean isEmailVerify = false;

    private boolean isAdmin = false;

    private boolean isSuperuser = false;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    @Column(name = "updated_at")
    private LocalDateTime updatedAt = LocalDateTime.now();

    private boolean isInSession = false;

    private boolean isOnline = false;

    @Enumerated(EnumType.STRING)
    private AuthProvider authProvider = AuthProvider.email;
}
