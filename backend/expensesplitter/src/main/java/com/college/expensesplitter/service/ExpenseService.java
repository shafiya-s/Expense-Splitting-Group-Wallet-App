package com.college.expensesplitter.service;

import com.college.expensesplitter.dto.BalanceEntry;
import com.college.expensesplitter.dto.CreateExpenseRequest;
import com.college.expensesplitter.dto.ExpenseResponse;
import com.college.expensesplitter.model.entity.*;
import com.college.expensesplitter.repository.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ExpenseService {

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository expenseSplitRepository;
    private final SettlementRepository settlementRepository;

    public ExpenseService(GroupRepository groupRepository,
                          UserRepository userRepository,
                          GroupMemberRepository groupMemberRepository,
                          ExpenseRepository expenseRepository,
                          ExpenseSplitRepository expenseSplitRepository,
                          SettlementRepository settlementRepository) {
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.groupMemberRepository = groupMemberRepository;
        this.expenseRepository = expenseRepository;
        this.expenseSplitRepository = expenseSplitRepository;
        this.settlementRepository = settlementRepository;
    }

    // ─── Add Expense (EQUAL split) ───────────────────────────────────────────

    @Transactional
    public ExpenseResponse createExpense(Long groupId, String payerEmail, CreateExpenseRequest req) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        User payer = userRepository.findByEmail(payerEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<GroupMember> members = groupMemberRepository.findByGroup_Id(groupId);
        if (members.isEmpty()) throw new RuntimeException("Group has no members");

        // Verify payer is a member
        boolean isMember = members.stream()
                .anyMatch(gm -> gm.getUser().getId().equals(payer.getId()));
        if (!isMember) throw new RuntimeException("You are not a member of this group");

        // Save expense
        Expense expense = Expense.builder()
                .group(group)
                .paidBy(payer)
                .amount(req.getAmount())
                .description(req.getDescription())
                .splitType(SplitType.EQUAL)
                .build();
        Expense saved = expenseRepository.save(expense);

        // Calculate equal shares — give the remainder cent to the last member
        int n = members.size();
        BigDecimal share = req.getAmount().divide(BigDecimal.valueOf(n), 2, RoundingMode.FLOOR);
        BigDecimal remainder = req.getAmount().subtract(share.multiply(BigDecimal.valueOf(n)));

        for (int i = 0; i < n; i++) {
            BigDecimal thisShare = (i == n - 1)
                    ? share.add(remainder)   // last member absorbs rounding difference
                    : share;

            ExpenseSplit split = ExpenseSplit.builder()
                    .expense(saved)
                    .user(members.get(i).getUser())
                    .shareAmount(thisShare)
                    .settled(false)
                    .build();
            expenseSplitRepository.save(split);
        }

        return toResponse(saved);
    }

    // ─── List Expenses for a Group ───────────────────────────────────────────

    public List<ExpenseResponse> getExpensesByGroup(Long groupId) {
        return expenseRepository.findByGroup_IdOrderByCreatedAtDesc(groupId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    // ─── Calculate Balances ──────────────────────────────────────────────────
    //
    // Algorithm:
    // 1. For each group member, compute net balance:
    //    + amount for every expense they paid
    //    - shareAmount for every split they owe
    //    + settlement amounts they paid out
    //    - settlement amounts they received
    // 2. Separate into debtors (negative) and creditors (positive)
    // 3. Greedy match to produce minimum-transaction "A owes B ₹X" list

    public List<BalanceEntry> getBalances(Long groupId) {
        List<GroupMember> members = groupMemberRepository.findByGroup_Id(groupId);
        List<Expense> expenses = expenseRepository.findByGroup_IdOrderByCreatedAtDesc(groupId);
        List<ExpenseSplit> allSplits = expenseSplitRepository.findByExpense_Group_Id(groupId);
        List<Settlement> settlements = settlementRepository.findByGroup_Id(groupId);

        // user id → name
        Map<Long, String> names = new HashMap<>();
        Map<Long, BigDecimal> netBalance = new HashMap<>();
        for (GroupMember gm : members) {
            Long uid = gm.getUser().getId();
            netBalance.put(uid, BigDecimal.ZERO);
            names.put(uid, gm.getUser().getName());
        }

        // +amount when a user paid for an expense
        for (Expense exp : expenses) {
            Long uid = exp.getPaidBy().getId();
            netBalance.merge(uid, exp.getAmount(), BigDecimal::add);
        }

        // -shareAmount for every split row
        for (ExpenseSplit split : allSplits) {
            Long uid = split.getUser().getId();
            netBalance.merge(uid, split.getShareAmount().negate(), BigDecimal::add);
        }

        // settlements: payer's balance goes up, receiver's goes down
        for (Settlement s : settlements) {
            netBalance.merge(s.getPaidBy().getId(), s.getAmount(), BigDecimal::add);
            netBalance.merge(s.getPaidTo().getId(), s.getAmount().negate(), BigDecimal::add);
        }

        // Split into debtors and creditors using mutable arrays
        record UserAmt(Long userId, BigDecimal[] amt) {}

        List<UserAmt> debtors = new ArrayList<>();
        List<UserAmt> creditors = new ArrayList<>();
        for (Map.Entry<Long, BigDecimal> e : netBalance.entrySet()) {
            BigDecimal bal = e.getValue().setScale(2, RoundingMode.HALF_UP);
            if (bal.compareTo(BigDecimal.ZERO) < 0) {
                debtors.add(new UserAmt(e.getKey(), new BigDecimal[]{bal.abs()}));
            } else if (bal.compareTo(BigDecimal.ZERO) > 0) {
                creditors.add(new UserAmt(e.getKey(), new BigDecimal[]{bal}));
            }
        }

        // Greedy matching
        List<BalanceEntry> result = new ArrayList<>();
        int d = 0, c = 0;
        while (d < debtors.size() && c < creditors.size()) {
            BigDecimal transfer = debtors.get(d).amt()[0].min(creditors.get(c).amt()[0]);

            result.add(BalanceEntry.builder()
                    .fromUserId(debtors.get(d).userId())
                    .fromUserName(names.get(debtors.get(d).userId()))
                    .toUserId(creditors.get(c).userId())
                    .toUserName(names.get(creditors.get(c).userId()))
                    .amount(transfer)
                    .build());

            debtors.get(d).amt()[0] = debtors.get(d).amt()[0].subtract(transfer);
            creditors.get(c).amt()[0] = creditors.get(c).amt()[0].subtract(transfer);

            if (debtors.get(d).amt()[0].compareTo(BigDecimal.ZERO) == 0) d++;
            if (creditors.get(c).amt()[0].compareTo(BigDecimal.ZERO) == 0) c++;
        }

        return result;
    }

    // ─── Helper ──────────────────────────────────────────────────────────────

    private ExpenseResponse toResponse(Expense e) {
        return ExpenseResponse.builder()
                .id(e.getId())
                .description(e.getDescription())
                .amount(e.getAmount())
                .splitType(e.getSplitType().name())
                .paidById(e.getPaidBy().getId())
                .paidByName(e.getPaidBy().getName())
                .createdAt(e.getCreatedAt())
                .build();
    }
}
