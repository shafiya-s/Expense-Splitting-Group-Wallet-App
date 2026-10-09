package com.college.expensesplitter.service;

import com.college.expensesplitter.dto.CreateGroupRequest;
import com.college.expensesplitter.dto.GroupResponse;
import com.college.expensesplitter.dto.MemberResponse;
import com.college.expensesplitter.dto.AddMemberRequest;
import com.college.expensesplitter.model.entity.*;
import com.college.expensesplitter.repository.*;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository expenseSplitRepository;
    private final SettlementRepository settlementRepository;

    public GroupService(GroupRepository groupRepository,
                        GroupMemberRepository groupMemberRepository,
                        UserRepository userRepository,
                        ExpenseRepository expenseRepository,
                        ExpenseSplitRepository expenseSplitRepository,
                        SettlementRepository settlementRepository) {
        this.groupRepository = groupRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.userRepository = userRepository;
        this.expenseRepository = expenseRepository;
        this.expenseSplitRepository = expenseSplitRepository;
        this.settlementRepository = settlementRepository;
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

        return toResponse(savedGroup, 1L, BigDecimal.ZERO);
    }

    // ─── Get all groups for logged-in user ───────────────────────────────────

    public List<GroupResponse> getGroupsForUser(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return groupMemberRepository.findByUser(user).stream()
                .map(gm -> {
                    Group g = gm.getGroup();
                    long memberCount = groupMemberRepository.countByGroup_Id(g.getId());
                    BigDecimal netBalance = calculateUserNetBalance(g.getId(), user.getId());
                    return toResponse(g, memberCount, netBalance);
                })
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

        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No user found with email: " + request.getEmail().trim()));

        if (groupMemberRepository.existsByGroupAndUser(group, user)) {
            throw new RuntimeException("User is already a member of this group");
        }

        GroupMember member = new GroupMember();
        member.setGroup(group);
        member.setUser(user);
        member.setRoleInGroup("MEMBER");
        groupMemberRepository.save(member);
    }

    private BigDecimal calculateUserNetBalance(Long groupId, Long userId) {
        List<Expense> expenses = expenseRepository.findByGroup_IdOrderByCreatedAtDesc(groupId);
        List<ExpenseSplit> allSplits = expenseSplitRepository.findByExpense_Group_Id(groupId);
        List<Settlement> settlements = settlementRepository.findByGroup_Id(groupId);

        BigDecimal netBalance = BigDecimal.ZERO;

        for (Expense exp : expenses) {
            if (exp.getPaidBy().getId().equals(userId)) {
                netBalance = netBalance.add(exp.getAmount());
            }
        }

        for (ExpenseSplit split : allSplits) {
            if (split.getUser().getId().equals(userId)) {
                netBalance = netBalance.subtract(split.getShareAmount());
            }
        }

        for (Settlement s : settlements) {
            if (s.getPaidBy().getId().equals(userId)) {
                netBalance = netBalance.add(s.getAmount());
            }
            if (s.getPaidTo().getId().equals(userId)) {
                netBalance = netBalance.subtract(s.getAmount());
            }
        }

        return netBalance.setScale(2, RoundingMode.HALF_UP);
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    private GroupResponse toResponse(Group group, long memberCount, BigDecimal userNetBalance) {
        return GroupResponse.builder()
                .id(group.getId())
                .name(group.getName())
                .description(group.getDescription())
                .createdById(group.getCreatedBy().getId())
                .createdByName(group.getCreatedBy().getName())
                .createdAt(group.getCreatedAt())
                .memberCount(memberCount)
                .userNetBalance(userNetBalance)
                .build();
    }
}