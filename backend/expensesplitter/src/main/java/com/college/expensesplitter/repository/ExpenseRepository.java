package com.college.expensesplitter.repository;

import com.college.expensesplitter.model.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    List<Expense> findByGroup_IdOrderByCreatedAtDesc(Long groupId);
}
