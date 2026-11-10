package com.When2Meet.calendar.ai.dto;

public record TimetableClassDto(
    String subject,
    String dayOfWeek,
    String startTime,
    String endTime,
    String room,
    String teacher
) {}