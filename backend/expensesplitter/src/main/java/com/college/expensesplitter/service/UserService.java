package com.college.expensesplitter.service;

import com.college.expensesplitter.dto.UpdateProfileRequest;
import com.college.expensesplitter.dto.UserProfileResponse;
import com.college.expensesplitter.dto.UserSearchResponse;
import com.college.expensesplitter.model.entity.FriendRequest;
import com.college.expensesplitter.model.entity.FriendshipStatus;
import com.college.expensesplitter.model.entity.User;
import com.college.expensesplitter.repository.FriendRequestRepository;
import com.college.expensesplitter.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final FriendRequestRepository friendRequestRepository;

    public UserService(UserRepository userRepository, FriendRequestRepository friendRequestRepository) {
        this.userRepository = userRepository;
        this.friendRequestRepository = friendRequestRepository;
    }

    public UserProfileResponse getProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        long friendsCount = friendRequestRepository.countAcceptedFriendships(user.getId());

        return UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .createdAt(user.getCreatedAt())
                .friendsCount(friendsCount)
                .build();
    }

    @Transactional
    public UserProfileResponse updateProfile(String email, UpdateProfileRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        user.setName(request.getName().trim());
        User saved = userRepository.save(user);

        long friendsCount = friendRequestRepository.countAcceptedFriendships(saved.getId());

        return UserProfileResponse.builder()
                .id(saved.getId())
                .name(saved.getName())
                .email(saved.getEmail())
                .createdAt(saved.getCreatedAt())
                .friendsCount(friendsCount)
                .build();
    }

    public List<UserSearchResponse> searchUsers(String currentUserEmail, String query) {
        if (query == null || query.trim().isBlank()) {
            return Collections.emptyList();
        }

        User currentUser = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<User> users = userRepository.searchUsers(query.trim(), currentUser.getId());

        List<FriendRequest> existingRequests = friendRequestRepository.findAllByUser(currentUser.getId());

        Map<Long, FriendRequest> relationshipMap = existingRequests.stream()
                .collect(Collectors.toMap(
                        fr -> fr.getSender().getId().equals(currentUser.getId())
                                ? fr.getReceiver().getId()
                                : fr.getSender().getId(),
                        fr -> fr,
                        (existing, replacement) -> existing
                ));

        return users.stream()
                .map(u -> {
                    String status = "NONE";
                    FriendRequest fr = relationshipMap.get(u.getId());
                    if (fr != null) {
                        if (fr.getStatus() == FriendshipStatus.ACCEPTED) {
                            status = "FRIENDS";
                        } else if (fr.getStatus() == FriendshipStatus.PENDING) {
                            if (fr.getSender().getId().equals(currentUser.getId())) {
                                status = "PENDING_SENT";
                            } else {
                                status = "PENDING_RECEIVED";
                            }
                        }
                    }

                    return UserSearchResponse.builder()
                            .id(u.getId())
                            .name(u.getName())
                            .email(u.getEmail())
                            .relationshipStatus(status)
                            .build();
                })
                .collect(Collectors.toList());
    }
}
