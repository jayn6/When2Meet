package com.When2Meet.calendar.friendship;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface FriendshipRepository
        extends JpaRepository<Friendship, Long> {

    // Incoming pending requests
    List<Friendship> findByReceiverIdAndStatus(
        Long receiverId,
        FriendshipStatus status
    );

    // Sent pending requests
    List<Friendship> findByRequesterIdAndStatus(
        Long requesterId,
        FriendshipStatus status
    );

    // Find request only if current user is its receiver
    Optional<Friendship> findByIdAndReceiverId(
        Long id,
        Long receiverId
    );

    // Check either direction
    @Query("""
        SELECT COUNT(f) > 0
        FROM Friendship f
        WHERE f.status = :status
        AND (
            (f.requester.id = :user1 AND f.receiver.id = :user2)
            OR
            (f.requester.id = :user2 AND f.receiver.id = :user1)
        )
    """)
    boolean existsBetween(
        @Param("user1") Long user1,
        @Param("user2") Long user2,
        @Param("status") FriendshipStatus status
    );

    // Find any existing request in either direction
    @Query("""
        SELECT f FROM Friendship f
        WHERE
            (f.requester.id = :user1 AND f.receiver.id = :user2)
            OR
            (f.requester.id = :user2 AND f.receiver.id = :user1)
    """)
    Optional<Friendship> findBetween(
        @Param("user1") Long user1,
        @Param("user2") Long user2
    );

    // All accepted friendships for a user
    @Query("""
        SELECT f FROM Friendship f
        WHERE f.status = :status
        AND (
            f.requester.id = :userId
            OR f.receiver.id = :userId
        )
    """)
    List<Friendship> findAccepted(
        @Param("userId") Long userId,
        @Param("status") FriendshipStatus status
    );
}