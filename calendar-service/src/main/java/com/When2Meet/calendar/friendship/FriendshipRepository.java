package com.When2Meet.calendar.friendship;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    List<Friendship> findByReceiverIdAndStatus(Long receiverId, FriendshipStatus status);

    List<Friendship> findByRequesterIdAndStatus(Long requesterId, FriendshipStatus status);

    Optional<Friendship> findByIdAndReceiverId(Long id, Long receiverId);
    
    // easier than an ORM
    @Query("""
        SELECT f FROM Friendship f
        WHERE (f.requester.id = :user1 AND f.receiver.id = :user2)
           OR (f.requester.id = :user2 AND f.receiver.id = :user1)
    """)
    Optional<Friendship> findBetween(@Param("user1") Long user1, @Param("user2") Long user2);

    @Query("""
        SELECT f FROM Friendship f
        WHERE f.status = :status
          AND (f.requester.id = :userId OR f.receiver.id = :userId)
    """)
    List<Friendship> findAccepted(@Param("userId") Long userId, @Param("status") FriendshipStatus status);
}