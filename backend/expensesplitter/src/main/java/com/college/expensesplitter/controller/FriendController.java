package com.college.expensesplitter.controller;

import com.college.expensesplitter.dto.FriendRequestResponse;
import com.college.expensesplitter.dto.FriendResponse;
import com.college.expensesplitter.dto.SendFriendRequest;
import com.college.expensesplitter.service.FriendService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/friends")
public class FriendController {

    private final FriendService friendService;

    public FriendController(FriendService friendService) {
        this.friendService = friendService;
    }

    @GetMapping
    public ResponseEntity<List<FriendResponse>> getFriends(Authentication authentication) {
        return ResponseEntity.ok(friendService.getFriends(authentication.getName()));
    }

    @GetMapping("/requests")
    public ResponseEntity<List<FriendRequestResponse>> getIncomingRequests(Authentication authentication) {
        return ResponseEntity.ok(friendService.getIncomingRequests(authentication.getName()));
    }

    @PostMapping("/requests")
    public ResponseEntity<FriendRequestResponse> sendFriendRequest(
            @Valid @RequestBody SendFriendRequest request,
            Authentication authentication) {
        return ResponseEntity.ok(friendService.sendFriendRequest(authentication.getName(), request));
    }

    @PostMapping("/requests/{requestId}/accept")
    public ResponseEntity<Void> acceptRequest(
            @PathVariable Long requestId,
            Authentication authentication) {
        friendService.acceptRequest(authentication.getName(), requestId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/requests/{requestId}/decline")
    public ResponseEntity<Void> declineRequest(
            @PathVariable Long requestId,
            Authentication authentication) {
        friendService.declineRequest(authentication.getName(), requestId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{friendUserId}")
    public ResponseEntity<Void> removeFriend(
            @PathVariable Long friendUserId,
            Authentication authentication) {
        friendService.removeFriend(authentication.getName(), friendUserId);
        return ResponseEntity.ok().build();
    }
}
