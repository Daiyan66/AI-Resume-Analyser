package com.example.ResumeSystemApplication.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecruiterStatsDto {
    private long activeJobs;
    private long pendingApplications;
    private long totalCandidates;
    private long newResumesToday;
    private List<Map<String, Object>> applicationTrend;
}
