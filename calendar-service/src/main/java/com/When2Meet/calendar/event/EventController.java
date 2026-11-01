package com.When2Meet.calendar.event;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "http://localhost:4200",
            methods = {RequestMethod.GET, RequestMethod.POST,
                        RequestMethod.PUT, RequestMethod.DELETE,
                        RequestMethod.OPTIONS})

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

    @PutMapping("/{id}")
    public Event updateEvent(@PathVariable Long id, @RequestBody Event updatedEvent){
        Event event= repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));

        event.setTitle(updatedEvent.getTitle());
        event.setDescription(updatedEvent.getDescription());
        event.setStartDateTime(updatedEvent.getStartDateTime());
        event.setEndDateTime(updatedEvent.getEndDateTime());
        event.setLocation(updatedEvent.getLocation());
        event.setType(updatedEvent.getType());
        event.setCategory(updatedEvent.getCategory());

        return repository.save(event);
    }

    @DeleteMapping("/{id}")
    public void deleteEvent(@PathVariable Long id) {
        repository.deleteById(id);
    }
}