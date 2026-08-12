package com.college.expensesplitter.repository;

import com.college.expensesplitter.model.entity.Group;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupRepository extends JpaRepository<Group,Long> {
}