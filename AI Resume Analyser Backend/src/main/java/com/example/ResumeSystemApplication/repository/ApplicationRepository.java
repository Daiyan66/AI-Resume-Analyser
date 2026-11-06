package com.example.ResumeSystemApplication.repository;

import com.example.ResumeSystemApplication.model.Application;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ApplicationRepository extends JpaRepository<Application, Long> {
    List<Application> findByJobIdOrderByMatchScoreDesc(Long jobId);
    List<Application> findByJobIdAndApplicationSourceOrderByMatchScoreDesc(Long jobId, Application.ApplicationSource source);
    List<Application> findByJobIdAndBatchIdOrderByMatchScoreDesc(Long jobId, String batchId);
    List<Application> findByResumeCandidateIdOrderByAppliedAtDesc(Long candidateId);
    Optional<Application> findByJobIdAndResumeId(Long jobId, Long resumeId);
    Optional<Application> findTopByResumeCandidateIdOrderByAppliedAtDesc(Long candidateId);

    @Query("SELECT a FROM Application a WHERE a.job.id = :jobId " +
           "AND a.resume.candidate.id = :candidateId " +
           "AND a.status = com.example.ResumeSystemApplication.model.Application.ApplicationStatus.REJECTED " +
           "ORDER BY a.rejectedAt DESC, a.appliedAt DESC")
    List<Application> findRejectedApplicationsForJobAndCandidate(@Param("jobId") Long jobId, @Param("candidateId") Long candidateId);

    @Query("SELECT a FROM Application a WHERE a.job.id = :jobId " +
           "AND a.resume.candidate.id = :candidateId " +
           "AND a.status IN (com.example.ResumeSystemApplication.model.Application.ApplicationStatus.PENDING, com.example.ResumeSystemApplication.model.Application.ApplicationStatus.ACCEPTED)")
    List<Application> findActiveApplicationsForJobAndCandidate(@Param("jobId") Long jobId, @Param("candidateId") Long candidateId);

    @Query("SELECT a FROM Application a WHERE a.job.id = :jobId " +
           "AND a.resume.candidate.id = :candidateId " +
           "ORDER BY a.appliedAt DESC")
    List<Application> findLatestByJobIdAndCandidateId(@Param("jobId") Long jobId, @Param("candidateId") Long candidateId);

    @Query("SELECT a FROM Application a WHERE a.status = com.example.ResumeSystemApplication.model.Application.ApplicationStatus.REJECTED " +
           "AND (a.reapplyEmailSent IS NULL OR a.reapplyEmailSent = false) " +
           "AND ((a.reapplyEligibleAt IS NOT NULL AND a.reapplyEligibleAt <= :now) " +
           "  OR (a.reapplyEligibleAt IS NULL AND a.rejectedAt IS NOT NULL AND a.rejectedAt <= :threeMonthsAgo) " +
           "  OR (a.reapplyEligibleAt IS NULL AND a.rejectedAt IS NULL AND a.appliedAt <= :threeMonthsAgo))")
    List<Application> findEligibleForReapplyEmail(@Param("now") LocalDateTime now, @Param("threeMonthsAgo") LocalDateTime threeMonthsAgo);
    
    long countByJobId(Long jobId);
    long countByStatus(Application.ApplicationStatus status);
    long countByJobCreatedById(Long recruiterId);
    long countByJobCreatedByIdAndStatus(Long recruiterId, Application.ApplicationStatus status);

    @Query("SELECT DISTINCT a.batchId FROM Application a WHERE a.job.id = :jobId AND a.batchId IS NOT NULL ORDER BY a.batchId DESC")
    List<String> findDistinctBatchIdsByJobId(@Param("jobId") Long jobId);

    @Query(value = "SELECT batch_id FROM applications WHERE job_id = :jobId AND batch_id IS NOT NULL ORDER BY applied_at DESC LIMIT 1", nativeQuery = true)
    Optional<String> findLatestBatchIdByJobId(@Param("jobId") Long jobId);

    @Query("SELECT COUNT(a) FROM Application a WHERE a.appliedAt BETWEEN :start AND :end")
    long countByAppliedAtBetween(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(a) FROM Application a WHERE a.job.createdBy.id = :recruiterId AND a.appliedAt BETWEEN :start AND :end")
    long countByJobCreatedByIdAndAppliedAtBetween(@Param("recruiterId") Long recruiterId,
                                                @Param("start") LocalDateTime start,
                                                @Param("end") LocalDateTime end);
}
