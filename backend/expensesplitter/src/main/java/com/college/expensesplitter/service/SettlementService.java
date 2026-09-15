package com.college.expensesplitter.service;

import com.college.expensesplitter.dto.CreateSettlementRequest;
import com.college.expensesplitter.model.entity.*;
import com.college.expensesplitter.repository.*;
import org.springframework.stereotype.Service;

@Service
public class SettlementService {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final SettlementRepository settlementRepository;

    public SettlementService(GroupRepository groupRepository,
                             UserRepository userRepository,
                             SettlementRepository settlementRepository) {
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.settlementRepository = settlementRepository;
    }

    public void createSettlement(Long groupId, String payerEmail, CreateSettlementRequest req) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        User payer = userRepository.findByEmail(payerEmail)
                .orElseThrow(() -> new RuntimeException("Payer user not found"));

        User recipient = userRepository.findById(req.getPaidToUserId())
                .orElseThrow(() -> new RuntimeException("Recipient user not found"));

        if (payer.getId().equals(recipient.getId())) {
            throw new RuntimeException("Cannot settle with yourself");
        }

        Settlement settlement = Settlement.builder()
                .group(group)
                .paidBy(payer)
                .paidTo(recipient)
                .amount(req.getAmount())
                .build();

        settlementRepository.save(settlement);
    }
}
