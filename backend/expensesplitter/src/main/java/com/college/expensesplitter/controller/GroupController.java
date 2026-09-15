package com.college.expensesplitter.controller;

import com.college.expensesplitter.dto.*;
import com.college.expensesplitter.service.GroupService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/groups")
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    // POST /api/v1/groups — create group; creator from JWT
    @PostMapping
    public ResponseEntity<GroupResponse> createGroup(
            @Valid @RequestBody CreateGroupRequest request,
            Authentication authentication) {

        String email = authentication.getName();
        return ResponseEntity.ok(groupService.createGroup(request, email));
    }

    // GET /api/v1/groups — all groups the logged-in user belongs to
    @GetMapping
    public ResponseEntity<List<GroupResponse>> getMyGroups(Authentication authentication) {
        String email = authentication.getName();
        return ResponseEntity.ok(groupService.getGroupsForUser(email));
    }

    // GET /api/v1/groups/{id}/members
    @GetMapping("/{id}/members")
    public ResponseEntity<List<MemberResponse>> getMembers(@PathVariable Long id) {
        return ResponseEntity.ok(groupService.getMembersOfGroup(id));
    }

    // POST /api/v1/groups/{id}/members — add a member by email
    @PostMapping("/{id}/members")
    public ResponseEntity<Void> addMember(
            @PathVariable Long id,
            @Valid @RequestBody AddMemberRequest request) {

        groupService.addMember(id, request);
        return ResponseEntity.ok().build();
    }
}