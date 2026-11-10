package com.When2Meet.calendar.ai;

import com.When2Meet.calendar.event.Event;
import com.When2Meet.calendar.event.EventRepository;

import com.When2Meet.calendar.ai.dto.*;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

@RestController
@RequestMapping("/api/ai/timetable")
@CrossOrigin(origins = "http://localhost:4200")
public class AiController {

    private final GeminiService geminiService;
    private final EventRepository eventRepository;

    public AiController(
        GeminiService geminiService,
        EventRepository eventRepository
    ) {
        this.geminiService = geminiService;
        this.eventRepository = eventRepository;
    }

    // STEP 1: Extract timetable
    @PostMapping(
        value = "/extract",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public TimetableExtractionResponse extract(
        @RequestPart("file") MultipartFile file
    ) throws Exception {

        if (file.isEmpty()) {
            throw new IllegalArgumentException("Please upload an image.");
        }

        if (file.getSize() > 10 * 1024 * 1024) {
            throw new IllegalArgumentException("Image must be under 10 MB.");
        }

        String type = file.getContentType();

        if (type == null ||
            !List.of("image/jpeg", "image/png", "image/webp")
                .contains(type)) {

            throw new IllegalArgumentException(
                "Only JPG, PNG and WEBP images are supported."
            );
        }

        return geminiService.extract(file);
    }

    // STEP 2: Confirm and save timetable
    @PostMapping("/confirm")
    public Map<String, Object> confirm(
        @RequestBody ConfirmTimetableRequest request
    ) {

        if (request.startDate() == null ||
            request.endDate() == null ||
            request.classes() == null ||
            request.classes().isEmpty()) {

            throw new IllegalArgumentException(
                "Schedule dates and classes are required."
            );
        }

        if (request.endDate().isBefore(request.startDate())) {
            throw new IllegalArgumentException(
                "End date must be after start date."
            );
        }

        if (ChronoUnit.DAYS.between(request.startDate(), request.endDate()) > 370) {

            throw new IllegalArgumentException(
                "Schedule period is too long."
            );
        }

        List<Event> eventsToSave = new ArrayList<>();

        // Go through every date in the schedule period
        for (LocalDate date = request.startDate();
             !date.isAfter(request.endDate());
             date = date.plusDays(1)) {

            for (TimetableClassDto timetableClass :
                    request.classes()) {

                DayOfWeek day;

                try {
                    day = DayOfWeek.valueOf(
                        timetableClass.dayOfWeek().toUpperCase()
                    );
                } catch (Exception ex) {
                    throw new IllegalArgumentException(
                        "Invalid weekday: " +
                        timetableClass.dayOfWeek()
                    );
                }

                // Only create events on matching weekdays
                if (date.getDayOfWeek() == day) {

                    LocalTime start =
                        LocalTime.parse(timetableClass.startTime());

                    LocalTime end =
                        LocalTime.parse(timetableClass.endTime());

                    if (!end.isAfter(start)) {
                        throw new IllegalArgumentException(
                            "Invalid class time."
                        );
                    }

                    Event event = new Event();

                    event.setTitle(timetableClass.subject());

                    event.setStartDateTime(
                        LocalDateTime.of(date, start)
                    );

                    event.setEndDateTime(
                        LocalDateTime.of(date, end)
                    );

                    event.setLocation(timetableClass.room());

                    event.setDescription(
                        timetableClass.teacher() == null
                            ? "Imported from timetable"
                            : "Teacher: " + timetableClass.teacher()
                    );

                    event.setCategory("CLASS");

                    eventsToSave.add(event);
                }
            }
        }

        List<Event> savedEvents =
            eventRepository.saveAll(eventsToSave);

        return Map.of(
            "message", "Timetable imported successfully.",
            "eventsCreated", savedEvents.size()
        );
    }
}