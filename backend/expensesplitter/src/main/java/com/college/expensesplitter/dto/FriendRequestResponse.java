package com.college.expensesplitter.dto;

import lombok.*;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FriendRequestResponse {
    private Long id;
    private Long senderId;
    private String senderName;
    private String senderEmail;
    private LocalDateTime createdAt;
}
