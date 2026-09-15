package com.college.expensesplitter.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GroupResponse {
    private Long id;
    private String name;
    private String description;
    private Long createdById;
    private String createdByName;
    private LocalDateTime createdAt;
}
