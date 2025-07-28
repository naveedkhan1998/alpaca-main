package com.breeze.backend.service;

import com.breeze.backend.dto.UserRegistrationDto;
import com.breeze.backend.model.User;
import com.breeze.backend.dto.UserPasswordResetDto;
import com.breeze.backend.dto.UserProfileDto;
import com.breeze.backend.dto.SendPasswordResetEmailDto;
import com.breeze.backend.dto.UserChangePasswordDto;

public interface UserService {
    UserProfileDto getUserProfile();
    User register(UserRegistrationDto userRegistrationDto);
    void resetPassword(String token, UserPasswordResetDto userPasswordResetDto);
    void sendPasswordResetEmail(SendPasswordResetEmailDto sendPasswordResetEmailDto);
    void changePassword(UserChangePasswordDto userChangePasswordDto);
}
