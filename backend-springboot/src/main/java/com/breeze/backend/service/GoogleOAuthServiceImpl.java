package com.breeze.backend.service;

import com.breeze.backend.dto.GoogleLoginDto;
import com.breeze.backend.model.User;
import com.breeze.backend.repository.UserRepository;
import com.breeze.backend.security.JwtTokenProvider;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class GoogleOAuthServiceImpl implements GoogleOAuthService {

    @Value("${google.oauth.client-id}")
    private String googleClientId;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Override
    public String googleLogin(GoogleLoginDto googleLoginDto) {
        GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), new JacksonFactory())
                .setAudience(Collections.singletonList(googleClientId))
                .build();

        GoogleIdToken idToken = null;
        try {
            idToken = verifier.verify(googleLoginDto.getToken());
        } catch (Exception e) {
            throw new RuntimeException("Invalid Google ID token");
        }

        if (idToken != null) {
            GoogleIdToken.Payload payload = idToken.getPayload();
            String email = payload.getEmail();
            User user = userRepository.findByEmail(email).orElse(null);

            if (user == null) {
                user = new User();
                user.setEmail(email);
                user.setName(payload.get("name").toString());
                user.setAuthProvider(com.breeze.backend.model.AuthProvider.google);
                user.setTc(true);
                userRepository.save(user);
            }

            UserDetails userDetails = new org.springframework.security.core.userdetails.User(user.getEmail(), "", Collections.emptyList());
            UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
            SecurityContextHolder.getContext().setAuthentication(authentication);

            return jwtTokenProvider.generateToken(userDetails);
        } else {
            throw new RuntimeException("Invalid Google ID token");
        }
    }
}
