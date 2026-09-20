package com.college.expensesplitter.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserSearchResponse {
    private Long id;
    private String name;
    private String email;
    private String relationshipStatus;
}
