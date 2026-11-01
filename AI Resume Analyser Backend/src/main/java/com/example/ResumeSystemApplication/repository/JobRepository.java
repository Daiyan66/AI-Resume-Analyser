package com.example.ResumeSystemApplication.repository;

import com.example.ResumeSystemApplication.model.JobDescription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface JobRepository extends JpaRepository<JobDescription, Long> {
    List<JobDescription> findByCreatedByIdOrderByCreatedAtDesc(Long userId);
    long countByCreatedById(Long userId);
    List<JobDescription> findAllByOrderByCreatedAtDesc();

    @Query(value = "SELECT * FROM job_descriptions j WHERE " +
           "(:query IS NULL OR :query = '' OR j.title LIKE CONCAT('%', :query, '%') OR j.description LIKE CONCAT('%', :query, '%') OR j.skills_required LIKE CONCAT('%', :query, '%')) AND " +
           "(:education IS NULL OR :education = '' OR j.education_level LIKE CONCAT('%', :education, '%')) AND " +
           "(:maxExp IS NULL OR j.experience_required <= :maxExp) ORDER BY j.created_at DESC", nativeQuery = true)
    List<JobDescription> searchJobs(@Param("query") String query,
                                    @Param("education") String education,
                                    @Param("maxExp") Integer maxExp);
}
