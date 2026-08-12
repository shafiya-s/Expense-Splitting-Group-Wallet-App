package com.college.expensesplitter.service;

import com.college.expensesplitter.model.entity.Group;
import com.college.expensesplitter.model.entity.GroupMember;
import com.college.expensesplitter.model.entity.User;
import com.college.expensesplitter.repository.GroupMemberRepository;
import com.college.expensesplitter.repository.GroupRepository;
import com.college.expensesplitter.repository.UserRepository;
import org.springframework.stereotype.Service;

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

    public Group createGroup(String name,String description,Long userId) {
        User user=userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Group group=new Group();
        group.setName(name);
        group.setDescription(description);
        group.setCreatedBy(user);

        Group savedGroup=groupRepository.save(group);

        GroupMember member=new GroupMember();
        member.setGroup(savedGroup);
        member.setUser(user);
        member.setRoleInGroup("ADMIN");

        groupMemberRepository.save(member);

        return savedGroup;
    }
}