package com.example.ResumeSystemApplication.repository;

import com.example.ResumeSystemApplication.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {
    List<Feedback> findByApplicationIdOrderByCreatedAtDesc(Long applicationId);
}
