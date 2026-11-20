package com.When2Meet.calendar.friendship;

import com.When2Meet.calendar.auth.JwtService;
import com.When2Meet.calendar.user.User;
import com.When2Meet.calendar.user.UserRepository;
import com.When2Meet.calendar.friendship.dto.FriendUserResponse;
import com.When2Meet.calendar.friendship.dto.FriendRequestResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class FriendshipController {

    private final FriendshipService friendshipService;
    private final UserRepository userRepository;
    private final JwtService jwtService;

    public FriendshipController(
        FriendshipService friendshipService,
        UserRepository userRepository,
        JwtService jwtService
    ) {
        this.friendshipService = friendshipService;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    private Long getCurrentUserId(String authorization) {
        String email = jwtService.extractEmail(authorization);

        User user = userRepository.findByEmail(email)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.UNAUTHORIZED,
                "Authenticated user not found."
            ));

        return user.getId();
    }

    // SEARCH STUDENTS
    @GetMapping("/users/search")
    public List<FriendUserResponse> searchUsers(
        @RequestParam(defaultValue = "") String query,
        @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {
        Long currentUserId = getCurrentUserId(authorization);

        return friendshipService.searchUsers(query, currentUserId);
    }

    // SEND REQUEST
    @PostMapping("/friends/requests/{userId}")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, String> sendRequest(
        @PathVariable Long userId,
        @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {
        friendshipService.sendRequest(
            userId,
            getCurrentUserId(authorization)
        );

        return Map.of("message", "Friend request sent.");
    }

    // RECEIVED REQUESTS
    @GetMapping("/friends/requests/received")
    public List<FriendRequestResponse> receivedRequests(
        @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {
        return friendshipService.getReceivedRequests(
            getCurrentUserId(authorization)
        );
    }

    // SENT REQUESTS
    @GetMapping("/friends/requests/sent")
    public List<FriendRequestResponse> sentRequests(
        @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {
        return friendshipService.getSentRequests(
            getCurrentUserId(authorization)
        );
    }

    // ACCEPT REQUEST
    @PatchMapping("/friends/requests/{id}/accept")
    public Map<String, String> acceptRequest(
        @PathVariable Long id,
        @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {
        friendshipService.acceptRequest(
            id,
            getCurrentUserId(authorization)
        );

        return Map.of("message", "Friend request accepted.");
    }

    // REJECT REQUEST
    @PatchMapping("/friends/requests/{id}/reject")
    public Map<String, String> rejectRequest(
        @PathVariable Long id,
        @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {
        friendshipService.rejectRequest(
            id,
            getCurrentUserId(authorization)
        );

        return Map.of("message", "Friend request rejected.");
    }

    // GET FRIENDS
    @GetMapping("/friends")
    public List<FriendUserResponse> getFriends(
        @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {
        return friendshipService.getFriends(
            getCurrentUserId(authorization)
        );
    }

    // UNFRIEND
    @DeleteMapping("/friends/{friendId}")
    public Map<String, String> unfriend(
        @PathVariable Long friendId,
        @RequestHeader(HttpHeaders.AUTHORIZATION) String authorization
    ) {
        friendshipService.unfriend(
            friendId,
            getCurrentUserId(authorization)
        );

        return Map.of("message", "Friend removed.");
    }
}