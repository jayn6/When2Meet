package com.When2Meet.calendar.friendship;

import com.When2Meet.calendar.user.User;
import com.When2Meet.calendar.user.UserRepository;
import com.When2Meet.calendar.friendship.dto.FriendUserResponse;
import com.When2Meet.calendar.friendship.dto.FriendRequestResponse;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@Service
public class FriendshipService {

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;

    public FriendshipService(
        FriendshipRepository friendshipRepository,
        UserRepository userRepository
    ) {
        this.friendshipRepository = friendshipRepository;
        this.userRepository = userRepository;
    }

    // SEARCH USERS
    public List<FriendUserResponse> searchUsers(
        String query,
        Long currentUserId
    ) {
        List<User> matchingUsers;
        if (query == null || query.isBlank()) {
            matchingUsers = userRepository.findAll();
        } else if (query.trim().length() < 2) {
            return List.of();
        } else {
            String search = query.trim();
            matchingUsers = userRepository
                .findByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCase(
                    search, search
                );
        }

        return matchingUsers.stream()
            .filter(user -> !user.getId().equals(currentUserId))
            .sorted(Comparator.comparing(User::getFullName, String.CASE_INSENSITIVE_ORDER))
            .map(user -> new FriendUserResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail()
            ))
            .toList();
    }

    // SEND FRIEND REQUEST
    @Transactional
    public void sendRequest(Long receiverId, Long currentUserId) {

        if (receiverId.equals(currentUserId)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "You cannot add yourself."
            );
        }

        User sender = userRepository.findById(currentUserId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Your account was not found."
            ));

        User receiver = userRepository.findById(receiverId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Student not found."
            ));

        var existing = friendshipRepository.findBetween(
            currentUserId, receiverId
        );

        if (existing.isPresent()) {
            Friendship friendship = existing.get();

            if (friendship.getStatus() == FriendshipStatus.ACCEPTED) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You are already friends."
                );
            }

            if (friendship.getStatus() == FriendshipStatus.PENDING) {
                throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "A friend request already exists."
                );
            }

            // Allow a new request after a previously rejected request.
            friendship.setRequester(sender);
            friendship.setReceiver(receiver);
            friendship.setStatus(FriendshipStatus.PENDING);

            friendshipRepository.save(friendship);
            return;
        }

        Friendship friendship = new Friendship();

        friendship.setRequester(sender);
        friendship.setReceiver(receiver);
        friendship.setStatus(FriendshipStatus.PENDING);

        friendshipRepository.save(friendship);
    }

    // RECEIVED REQUESTS
    @Transactional(readOnly = true)
    public List<FriendRequestResponse> getReceivedRequests(
        Long currentUserId
    ) {
        return friendshipRepository.findByReceiverIdAndStatus(
            currentUserId,
            FriendshipStatus.PENDING
        ).stream()
            .map(f -> new FriendRequestResponse(
                f.getId(),
                f.getRequester().getId(),
                f.getRequester().getFullName(),
                f.getRequester().getEmail(),
                f.getCreatedAt()
            ))
            .toList();
    }

    // SENT REQUESTS
    @Transactional(readOnly = true)
    public List<FriendRequestResponse> getSentRequests(
        Long currentUserId
    ) {
        return friendshipRepository.findByRequesterIdAndStatus(
            currentUserId,
            FriendshipStatus.PENDING
        ).stream()
            .map(f -> new FriendRequestResponse(
                f.getId(),
                f.getReceiver().getId(),
                f.getReceiver().getFullName(),
                f.getReceiver().getEmail(),
                f.getCreatedAt()
            ))
            .toList();
    }

    // ACCEPT REQUEST
    @Transactional
    public void acceptRequest(Long requestId, Long currentUserId) {

        Friendship friendship = friendshipRepository
            .findByIdAndReceiverId(requestId, currentUserId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Friend request not found."
            ));

        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "This request is no longer pending."
            );
        }

        friendship.setStatus(FriendshipStatus.ACCEPTED);

        friendshipRepository.save(friendship);
    }

    // REJECT REQUEST
    @Transactional
    public void rejectRequest(Long requestId, Long currentUserId) {

        Friendship friendship = friendshipRepository
            .findByIdAndReceiverId(requestId, currentUserId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Friend request not found."
            ));

        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "This request is no longer pending."
            );
        }

        friendship.setStatus(FriendshipStatus.REJECTED);

        friendshipRepository.save(friendship);
    }

    // GET ACCEPTED FRIENDS
    @Transactional(readOnly = true)
    public List<FriendUserResponse> getFriends(Long currentUserId) {

        return friendshipRepository.findAccepted(
            currentUserId,
            FriendshipStatus.ACCEPTED
        ).stream()
            .map(friendship -> {

                User friend = friendship.getRequester()
                    .getId().equals(currentUserId)
                    ? friendship.getReceiver()
                    : friendship.getRequester();

                return new FriendUserResponse(
                    friend.getId(),
                    friend.getFullName(),
                    friend.getEmail()
                );
            })
            .toList();
    }

    // UNFRIEND
    @Transactional
    public void unfriend(Long friendId, Long currentUserId) {

        Friendship friendship = friendshipRepository
            .findBetween(currentUserId, friendId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND,
                "Friendship not found."
            ));

        if (friendship.getStatus() != FriendshipStatus.ACCEPTED) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "This student is not your friend."
            );
        }

        friendshipRepository.delete(friendship);
    }
}