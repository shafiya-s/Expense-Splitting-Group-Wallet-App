package com.college.expensesplitter.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseResponse {
    private Long id;
    private String description;
    private BigDecimal amount;
    private String splitType;
    private Long paidById;
    private String paidByName;
    private LocalDateTime createdAt;
}
