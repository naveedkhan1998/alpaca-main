package com.breeze.backend.controller;

import com.breeze.backend.dto.*;
import com.breeze.backend.security.JwtTokenProvider;
import com.breeze.backend.service.GoogleOAuthService;
import com.breeze.backend.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/account")
public class AccountController {

    @Autowired
    private UserService userService;

    @Autowired
    private GoogleOAuthService googleOAuthService;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @PostMapping("/reset-password/{token}")
    public ResponseEntity<?> resetPassword(@PathVariable String token, @RequestBody UserPasswordResetDto userPasswordResetDto) {
        userService.resetPassword(token, userPasswordResetDto);
        return ResponseEntity.ok("Password reset successfully");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> sendPasswordResetEmail(@RequestBody SendPasswordResetEmailDto sendPasswordResetEmailDto) {
        userService.sendPasswordResetEmail(sendPasswordResetEmailDto);
        return ResponseEntity.ok("Password reset email sent successfully");
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody UserChangePasswordDto userChangePasswordDto) {
        userService.changePassword(userChangePasswordDto);
        return ResponseEntity.ok("Password changed successfully");
    }

    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile() {
        UserProfileDto userProfile = userService.getUserProfile();
        return ResponseEntity.ok(userProfile);
    }

    @PostMapping("/social/google")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginDto googleLoginDto) {
        String token = googleOAuthService.googleLogin(googleLoginDto);
        return ResponseEntity.ok(token);
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody UserRegistrationDto userRegistrationDto) {
        userService.register(userRegistrationDto);
        return ResponseEntity.ok("User registered successfully");
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody UserLoginDto userLoginDto) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(userLoginDto.getEmail(), userLoginDto.getPassword())
        );
        SecurityContextHolder.getContext().setAuthentication(authentication);
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();
        String token = jwtTokenProvider.generateToken(userDetails);
        return ResponseEntity.ok(token);
    }
}
 