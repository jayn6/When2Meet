package com.When2Meet.calendar.event;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EventRepository extends JpaRepository<Event, Long> {
        boolean existsByStartDateTimeLessThanAndEndDateTimeGreaterThan(
                java.time.LocalDateTime end, java.time.LocalDateTime start
        );
        
}