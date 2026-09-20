package com.college.expensesplitter.service;

import com.college.expensesplitter.dto.FriendRequestResponse;
import com.college.expensesplitter.dto.FriendResponse;
import com.college.expensesplitter.dto.SendFriendRequest;
import com.college.expensesplitter.model.entity.FriendRequest;
import com.college.expensesplitter.model.entity.FriendshipStatus;
import com.college.expensesplitter.model.entity.User;
import com.college.expensesplitter.repository.FriendRequestRepository;
import com.college.expensesplitter.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class FriendService {

    private final FriendRequestRepository friendRequestRepository;
    private final UserRepository userRepository;

    public FriendService(FriendRequestRepository friendRequestRepository, UserRepository userRepository) {
        this.friendRequestRepository = friendRequestRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public FriendRequestResponse sendFriendRequest(String senderEmail, SendFriendRequest request) {
        User sender = userRepository.findByEmail(senderEmail)
                .orElseThrow(() -> new RuntimeException("Sender not found"));

        if (sender.getId().equals(request.getReceiverId())) {
            throw new RuntimeException("You cannot send a friend request to yourself");
        }

        User receiver = userRepository.findById(request.getReceiverId())
                .orElseThrow(() -> new RuntimeException("Receiver user not found"));

        Optional<FriendRequest> existingOpt = friendRequestRepository.findBetweenUsers(sender.getId(), receiver.getId());

        FriendRequest friendRequest;

        if (existingOpt.isPresent()) {
            FriendRequest existing = existingOpt.get();
            if (existing.getStatus() == FriendshipStatus.ACCEPTED) {
                throw new RuntimeException("You are already friends with this user");
            } else if (existing.getStatus() == FriendshipStatus.PENDING) {
                if (existing.getSender().getId().equals(sender.getId())) {
                    throw new RuntimeException("Friend request already sent");
                } else {
                    throw new RuntimeException("This user has already sent you a friend request. Please check your incoming requests.");
                }
            } else {
                // DECLINED -> reuse and set to PENDING
                existing.setSender(sender);
                existing.setReceiver(receiver);
                existing.setStatus(FriendshipStatus.PENDING);
                friendRequest = friendRequestRepository.save(existing);
            }
        } else {
            friendRequest = FriendRequest.builder()
                    .sender(sender)
                    .receiver(receiver)
                    .status(FriendshipStatus.PENDING)
                    .build();
            friendRequest = friendRequestRepository.save(friendRequest);
        }

        return toRequestResponse(friendRequest);
    }

    public List<FriendRequestResponse> getIncomingRequests(String receiverEmail) {
        User receiver = userRepository.findByEmail(receiverEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return friendRequestRepository.findByReceiver_IdAndStatusOrderByCreatedAtDesc(
                receiver.getId(),
                FriendshipStatus.PENDING
        ).stream().map(this::toRequestResponse).collect(Collectors.toList());
    }

    @Transactional
    public void acceptRequest(String receiverEmail, Long requestId) {
        User receiver = userRepository.findByEmail(receiverEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Friend request not found"));

        if (!request.getReceiver().getId().equals(receiver.getId())) {
            throw new RuntimeException("Unauthorized: You can only accept requests sent to you");
        }

        request.setStatus(FriendshipStatus.ACCEPTED);
        friendRequestRepository.save(request);
    }

    @Transactional
    public void declineRequest(String receiverEmail, Long requestId) {
        User receiver = userRepository.findByEmail(receiverEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Friend request not found"));

        if (!request.getReceiver().getId().equals(receiver.getId())) {
            throw new RuntimeException("Unauthorized: You can only decline requests sent to you");
        }

        request.setStatus(FriendshipStatus.DECLINED);
        friendRequestRepository.save(request);
    }

    public List<FriendResponse> getFriends(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<FriendRequest> accepted = friendRequestRepository.findAcceptedFriendships(user.getId());

        return accepted.stream().map(fr -> {
            User friend = fr.getSender().getId().equals(user.getId()) ? fr.getReceiver() : fr.getSender();
            return FriendResponse.builder()
                    .id(friend.getId())
                    .name(friend.getName())
                    .email(friend.getEmail())
                    .since(fr.getUpdatedAt() != null ? fr.getUpdatedAt() : fr.getCreatedAt())
                    .build();
        }).collect(Collectors.toList());
    }

    @Transactional
    public void removeFriend(String email, Long friendUserId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        FriendRequest fr = friendRequestRepository.findBetweenUsers(user.getId(), friendUserId)
                .orElseThrow(() -> new RuntimeException("Friendship not found"));

        friendRequestRepository.delete(fr);
    }

    private FriendRequestResponse toRequestResponse(FriendRequest fr) {
        return FriendRequestResponse.builder()
                .id(fr.getId())
                .senderId(fr.getSender().getId())
                .senderName(fr.getSender().getName())
                .senderEmail(fr.getSender().getEmail())
                .createdAt(fr.getCreatedAt())
                .build();
    }
}
