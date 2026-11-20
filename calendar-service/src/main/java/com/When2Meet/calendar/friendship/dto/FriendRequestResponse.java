package com.When2Meet.calendar.friendship.dto;

import java.time.LocalDateTime;

public record FriendRequestResponse(
    Long id,
    Long userId,
    String fullName,
    String email,
    LocalDateTime createdAt
) {}