package com.example.ResumeSystemApplication.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecruiterOverviewDto {
    private Long id;
    private String username;
    private String email;
    private String firstName;
    private String lastName;
    private long jobsCount;
    private LocalDateTime createdAt;
}
