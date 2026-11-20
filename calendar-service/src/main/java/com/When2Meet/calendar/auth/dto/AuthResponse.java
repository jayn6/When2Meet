package com.When2Meet.calendar.auth.dto;

public record AuthResponse(
    String token,
    Long userId,
    String fullName,
    String email
) {}