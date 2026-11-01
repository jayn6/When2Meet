package com.When2Meet.calendar.event;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "http://localhost:4200")
public class EventController {

    private final EventRepository repository;

    public EventController(EventRepository repository) {
        this.repository = repository;
    }

    @GetMapping
    public List<Event> getAllEvents() {
        return repository.findAll();
    }

    @PostMapping
    public Event createEvent(@RequestBody Event event) {

        if (event.getTitle() == null ||
                event.getTitle().isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }

        if (event.getStartDateTime() == null ||
                event.getEndDateTime() == null ||
                !event.getEndDateTime().isAfter(event.getStartDateTime())) {
            throw new IllegalArgumentException("Invalid event dates");
        }

        return repository.save(event);
    }
}