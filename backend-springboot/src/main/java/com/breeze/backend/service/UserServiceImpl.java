package com.breeze.backend.service;

import com.breeze.backend.dto.*;
import com.breeze.backend.model.User;
import com.breeze.backend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
public class UserServiceImpl implements UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private RedisTemplate<String, String> redisTemplate;

    @Override
    public void sendPasswordResetEmail(SendPasswordResetEmailDto sendPasswordResetEmailDto) {
        User user = userRepository.findByEmail(sendPasswordResetEmailDto.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String token = UUID.randomUUID().toString();
        redisTemplate.opsForValue().set("password_reset:" + token, user.getEmail(), 15, TimeUnit.MINUTES); // Token
                                                                                                           // valid for
                                                                                                           // 15 minutes

        // TODO: Send email with reset link (e.g.,
        // http://localhost:8080/api/account/reset-password/ + token)
        System.out.println("Password reset token for " + user.getEmail() + ": " + token);
    }

    @Override
    public void resetPassword(String token, UserPasswordResetDto userPasswordResetDto) {
        String email = redisTemplate.opsForValue().get("password_reset:" + token);
        if (email == null) {
            throw new RuntimeException("Invalid or expired token");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!userPasswordResetDto.getNewPassword().equals(userPasswordResetDto.getNewPassword2())) {
            throw new RuntimeException("New passwords don't match");
        }

        user.setPassword(passwordEncoder.encode(userPasswordResetDto.getNewPassword()));
        userRepository.save(user);
        redisTemplate.delete("password_reset:" + token);
    }

    @Override
    public void changePassword(UserChangePasswordDto userChangePasswordDto) {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String email = userDetails.getUsername();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(userChangePasswordDto.getOldPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid old password");
        }

        if (!userChangePasswordDto.getNewPassword().equals(userChangePasswordDto.getNewPassword2())) {
            throw new RuntimeException("New passwords don't match");
        }

        user.setPassword(passwordEncoder.encode(userChangePasswordDto.getNewPassword()));
        userRepository.save(user);
    }

    @Override
    public UserProfileDto getUserProfile() {
        UserDetails userDetails = (UserDetails) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        String email = userDetails.getUsername();
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));
        UserProfileDto userProfileDto = new UserProfileDto();
        userProfileDto.setId(user.getId());
        userProfileDto.setEmail(user.getEmail());
        userProfileDto.setName(user.getName());
        userProfileDto.setAvatar(user.getAvatar());
        userProfileDto.setAdmin(user.isAdmin());
        userProfileDto.setAuthProvider(user.getAuthProvider().toString());
        return userProfileDto;
    }

    @Override
    public User register(UserRegistrationDto userRegistrationDto) {
        User user = new User();
        user.setEmail(userRegistrationDto.getEmail());
        user.setName(userRegistrationDto.getName());
        user.setPassword(passwordEncoder.encode(userRegistrationDto.getPassword()));
        user.setTc(userRegistrationDto.isTc());
        return userRepository.save(user);
    }
}
