package com.college.expensesplitter.repository;

import com.college.expensesplitter.model.entity.Settlement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SettlementRepository extends JpaRepository<Settlement, Long> {
    List<Settlement> findByGroup_Id(Long groupId);
}
