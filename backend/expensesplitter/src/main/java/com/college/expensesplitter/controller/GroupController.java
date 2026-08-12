package com.college.expensesplitter.controller;

import com.college.expensesplitter.model.entity.Group;
import com.college.expensesplitter.service.GroupService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/groups")
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService) {
        this.groupService = groupService;
    }

    @PostMapping
    public ResponseEntity<Group> createGroup(
            @RequestParam String name,
            @RequestParam(required = false) String description,
            @RequestParam Long userId) {

        Group group=groupService.createGroup(name,description,userId);
        return ResponseEntity.ok(group);
    }
}