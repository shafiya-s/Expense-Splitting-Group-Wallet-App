package com.college.expensesplitter.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class AddMemberRequest {
    @NotBlank
    @Email
    private String email;
}
