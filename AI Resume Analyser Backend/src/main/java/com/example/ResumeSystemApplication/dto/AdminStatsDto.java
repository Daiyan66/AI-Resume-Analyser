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
public class AdminStatsDto {
    private long totalUsers;
    private long totalCandidates;
    private long totalRecruiters;
    private long totalAdmins;
    private long totalJobs;
    private long totalApplications;
    private long totalResumes;
    private List<Map<String, Object>> applicationTrend;
    private List<Map<String, Object>> registrationTrend;
    private List<Map<String, Object>> userRoleDistribution;
}
