package com.When2Meet.calendar.event;

import org.springframework.web.bind.annotation.*;
import java.util.List;
import com.When2Meet.calendar.friendship.FriendshipRepository;
import com.When2Meet.calendar.friendship.FriendshipStatus;
import com.When2Meet.calendar.user.User;
import com.When2Meet.calendar.user.UserRepository;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "http://localhost:4200",
            methods = {RequestMethod.GET, RequestMethod.POST,
                        RequestMethod.PUT, RequestMethod.DELETE,
                        RequestMethod.OPTIONS})

public class EventController {

    private final EventRepository repository;
    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;

    public EventController(EventRepository repository,
                        FriendshipRepository friendshipRepository,
                        UserRepository userRepository) {
        this.repository = repository;
        this.friendshipRepository = friendshipRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<Event> getAllEvents(@RequestHeader("X-User-Id") Long userId) {
        List<Long> friendIds = friendshipRepository
            .findAccepted(userId, FriendshipStatus.ACCEPTED)
            .stream()
            .map(f -> f.getRequester().getId().equals(userId)
                    ? f.getReceiver().getId()
                    : f.getRequester().getId())
            .toList();

        if (friendIds.isEmpty()) {
            return repository.findByOwner_Id(userId);
        }
        
        return repository.findVisibleTo(userId, friendIds);
    }

    @PostMapping
    public Event createEvent(@RequestHeader("X-User-Id") Long userId,
                        @RequestBody Event event) {

        if (event.getTitle() == null ||
                event.getTitle().isBlank()) {
            throw new IllegalArgumentException("Title is required");
        }

        if (event.getStartDateTime() == null ||
                event.getEndDateTime() == null ||
                !event.getEndDateTime().isAfter(event.getStartDateTime())) {
            throw new IllegalArgumentException("Invalid event dates");
        }

        if (repository.existsByOwner_IdAndStartDateTimeLessThanAndEndDateTimeGreaterThan(
                userId, event.getEndDateTime(), event.getStartDateTime())) {
            throw new IllegalArgumentException("You already have an event at this time.");
        }

        User owner = userRepository.findById(userId)
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        event.setOwner(owner);
        if (event.getType() == null) {
            event.setType("PRIVATE");
        }

        return repository.save(event);
    }

    @PutMapping("/{id}")
    public Event updateEvent(@RequestHeader("X-User-Id") Long userId,
                        @PathVariable Long id, 
                        @RequestBody Event updatedEvent){
        Event event= getOwnedEvent(id, userId);

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
    public void deleteEvent(@RequestHeader("X-User-Id") Long userId,
                        @PathVariable Long id) {
        repository.delete(getOwnedEvent(id, userId));
    }

    // you can not delete or edit others events
    private Event getOwnedEvent(Long id, Long userId) {
        Event event = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Event not found"));
        if (event.getOwner() == null || !event.getOwner().getId().equals(userId)) {
            throw new IllegalArgumentException("You can only change your own events.");
        }
        return event;
    }
}