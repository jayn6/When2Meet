package com.When2Meet.calendar.ai.dto;

import java.util.List;

public record TimetableExtractionResponse(
    List<TimetableClassDto> classes
) {}