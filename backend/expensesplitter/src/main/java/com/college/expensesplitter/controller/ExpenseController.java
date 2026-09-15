package com.college.expensesplitter.controller;

import com.college.expensesplitter.dto.BalanceEntry;
import com.college.expensesplitter.dto.CreateExpenseRequest;
import com.college.expensesplitter.dto.ExpenseResponse;
import com.college.expensesplitter.service.ExpenseService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/groups/{groupId}/expenses")
public class ExpenseController {

    private final ExpenseService expenseService;

    public ExpenseController(ExpenseService expenseService) {
        this.expenseService = expenseService;
    }

    // POST /api/v1/groups/{groupId}/expenses
    @PostMapping
    public ResponseEntity<ExpenseResponse> addExpense(
            @PathVariable Long groupId,
            @Valid @RequestBody CreateExpenseRequest request,
            Authentication authentication) {

        String email = authentication.getName();
        return ResponseEntity.ok(expenseService.createExpense(groupId, email, request));
    }

    // GET /api/v1/groups/{groupId}/expenses
    @GetMapping
    public ResponseEntity<List<ExpenseResponse>> getExpenses(@PathVariable Long groupId) {
        return ResponseEntity.ok(expenseService.getExpensesByGroup(groupId));
    }

    // GET /api/v1/groups/{groupId}/balances
    @GetMapping("/balances")
    public ResponseEntity<List<BalanceEntry>> getBalances(@PathVariable Long groupId) {
        return ResponseEntity.ok(expenseService.getBalances(groupId));
    }
}
