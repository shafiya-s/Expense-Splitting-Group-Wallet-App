package com.college.expensesplitter.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MemberResponse {
    private Long userId;
    private String name;
    private String email;
    private String roleInGroup;
}
