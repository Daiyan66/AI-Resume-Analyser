package com.example.ResumeSystemApplication.repository;

import com.example.ResumeSystemApplication.model.Resume;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ResumeRepository extends JpaRepository<Resume, Long> {
    List<Resume> findByCandidateIdOrderByUploadedAtDesc(Long candidateId);
    Optional<Resume> findTopByCandidateIdOrderByUploadedAtDesc(Long candidateId);
    long countByUploadedAtAfter(LocalDateTime date);
}
