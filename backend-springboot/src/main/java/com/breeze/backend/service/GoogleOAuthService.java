package com.breeze.backend.service;

import com.breeze.backend.dto.GoogleLoginDto;

public interface GoogleOAuthService {
    String googleLogin(GoogleLoginDto googleLoginDto);
}
