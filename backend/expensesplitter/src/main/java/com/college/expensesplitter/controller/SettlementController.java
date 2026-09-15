package com.college.expensesplitter.controller;

import com.college.expensesplitter.dto.CreateSettlementRequest;
import com.college.expensesplitter.service.SettlementService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/groups/{groupId}/settlements")
public class SettlementController {

    private final SettlementService settlementService;

    public SettlementController(SettlementService settlementService) {
        this.settlementService = settlementService;
    }

    // POST /api/v1/groups/{groupId}/settlements
    @PostMapping
    public ResponseEntity<Void> recordSettlement(
            @PathVariable Long groupId,
            @Valid @RequestBody CreateSettlementRequest request,
            Authentication authentication) {

        String email = authentication.getName();
        settlementService.createSettlement(groupId, email, request);
        return ResponseEntity.ok().build();
    }
}
