package com.When2Meet.calendar.auth;

import com.When2Meet.calendar.auth.dto.AuthResponse;
import com.When2Meet.calendar.auth.dto.LoginRequest;
import com.When2Meet.calendar.auth.dto.SignupRequest;
import com.When2Meet.calendar.user.User;
import com.When2Meet.calendar.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordHasher passwordHasher;
    private final JwtService jwtService;

    public AuthService(
        UserRepository userRepository,
        PasswordHasher passwordHasher,
        JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.passwordHasher = passwordHasher;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String email = normalizeEmail(request.email());

        if (userRepository.existsByEmail(email)) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "Email already exists"
            );
        }

        User user = new User();
        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setPassword(passwordHasher.encode(request.password()));

        user = userRepository.save(user);

        String token = jwtService.generateToken(user);

        return new AuthResponse(
            token,
            user.getId(),
            user.getFullName(),
            user.getEmail()
        );
    }

    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid email or password"
            ));

        if (!passwordHasher.matches(request.password(), user.getPassword())) {
            throw new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Invalid email or password"
            );
        }

        String token = jwtService.generateToken(user);

        return new AuthResponse(
            token,
            user.getId(),
            user.getFullName(),
            user.getEmail()
        );
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(java.util.Locale.ROOT);
    }
}