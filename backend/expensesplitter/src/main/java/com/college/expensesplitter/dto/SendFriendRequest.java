package com.college.expensesplitter.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SendFriendRequest {

    @NotNull(message = "Receiver ID is required")
    private Long receiverId;
}
