package com.When2Meet.calendar.ai.dto;

import java.time.LocalDate;
import java.util.List;

public record ConfirmTimetableRequest(
    LocalDate startDate,
    LocalDate endDate,
    List<TimetableClassDto> classes
) {}