package com.college.expensesplitter.service;

import com.college.expensesplitter.dto.CreateGroupRequest;
import com.college.expensesplitter.dto.GroupResponse;
import com.college.expensesplitter.dto.MemberResponse;
import com.college.expensesplitter.dto.AddMemberRequest;
import com.college.expensesplitter.model.entity.Group;
import com.college.expensesplitter.model.entity.GroupMember;
import com.college.expensesplitter.model.entity.User;
import com.college.expensesplitter.repository.GroupMemberRepository;
import com.college.expensesplitter.repository.GroupRepository;
import com.college.expensesplitter.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;

    public GroupService(GroupRepository groupRepository,
                        GroupMemberRepository groupMemberRepository,
                        UserRepository userRepository) {
        this.groupRepository = groupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.userRepository = userRepository;
    }

    // ─── Create Group ────────────────────────────────────────────────────────

    public GroupResponse createGroup(CreateGroupRequest request, String creatorEmail) {
        User user = userRepository.findByEmail(creatorEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Group group = new Group();
        group.setName(request.getName());
        group.setDescription(request.getDescription());
        group.setCreatedBy(user);

        Group savedGroup = groupRepository.save(group);

        // Auto-add creator as ADMIN
        GroupMember member = new GroupMember();
        member.setGroup(savedGroup);
        member.setUser(user);
        member.setRoleInGroup("ADMIN");
        groupMemberRepository.save(member);

        return toResponse(savedGroup);
    }

    // ─── Get all groups for logged-in user ───────────────────────────────────

    public List<GroupResponse> getGroupsForUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return groupMemberRepository.findByUser(user).stream()
                .map(gm -> toResponse(gm.getGroup()))
                .collect(Collectors.toList());
    }

    // ─── Get members of a group ──────────────────────────────────────────────

    public List<MemberResponse> getMembersOfGroup(Long groupId) {
        return groupMemberRepository.findByGroup_Id(groupId).stream()
                .map(gm -> MemberResponse.builder()
                        .userId(gm.getUser().getId())
                        .name(gm.getUser().getName())
                        .email(gm.getUser().getEmail())
                        .roleInGroup(gm.getRoleInGroup())
                        .build())
                .collect(Collectors.toList());
    }

    // ─── Add member by email ─────────────────────────────────────────────────

    public void addMember(Long groupId, AddMemberRequest request) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("No user found with email: " + request.getEmail()));

        if (groupMemberRepository.existsByGroupAndUser(group, user)) {
            throw new RuntimeException("User is already a member of this group");
        }

        GroupMember member = new GroupMember();
        member.setGroup(group);
        member.setUser(user);
        member.setRoleInGroup("MEMBER");
        groupMemberRepository.save(member);
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    private GroupResponse toResponse(Group group) {
        return GroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .createdById(group.getCreatedBy().getId())
                .createdByName(group.getCreatedBy().getName())
                .createdAt(group.getCreatedAt())
                .build();
    }
}