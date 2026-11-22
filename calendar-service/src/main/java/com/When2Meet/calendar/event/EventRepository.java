package com.When2Meet.calendar.event;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.Collection;
import java.util.List;

public interface EventRepository extends JpaRepository<Event, Long> {
        /*boolean existsByStartDateTimeLessThanAndEndDateTimeGreaterThan(
                java.time.LocalDateTime end, java.time.LocalDateTime start
        );*/

        @Query("SELECT e FROM Event e WHERE e.owner.id = :userId OR (e.type = 'SHARED' AND e.owner.id IN :friendIds)")
        List<Event> findVisibleTo(@Param("userId") Long userId,
                                @Param("friendIds") Collection<Long> friendIds);

        List<Event> findByOwner_Id(Long ownerId);
        boolean existsByOwner_IdAndStartDateTimeLessThanAndEndDateTimeGreaterThan(
                Long ownerId, java.time.LocalDateTime end, java.time.LocalDateTime start);
}