package com.college.expensesplitter.repository;

import com.college.expensesplitter.model.entity.Group;
import com.college.expensesplitter.model.entity.GroupMember;
import com.college.expensesplitter.model.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface GroupMemberRepository extends JpaRepository<GroupMember, Long> {

    List<GroupMember> findByUser(User user);

    List<GroupMember> findByGroup_Id(Long groupId);

    boolean existsByGroupAndUser(Group group, User user);
}