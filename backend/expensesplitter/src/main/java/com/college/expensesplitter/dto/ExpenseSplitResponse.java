package com.college.expensesplitter.dto;

import lombok.*;
import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExpenseSplitResponse {
    private Long id;
    private Long userId;
    private String userName;
    private BigDecimal shareAmount;
    private boolean settled;
}
