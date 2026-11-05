package com.example.ResumeSystemApplication.repository;

import com.example.ResumeSystemApplication.model.RecruiterInvitation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RecruiterInvitationRepository extends JpaRepository<RecruiterInvitation, Long> {
    Optional<RecruiterInvitation> findByInviteTokenAndIsUsedFalse(String inviteToken);
    Optional<RecruiterInvitation> findByEmailAndIsUsedFalse(String email);
    Optional<RecruiterInvitation> findTopByEmailOrderByCreatedAtDesc(String email);
    List<RecruiterInvitation> findByEmail(String email);
    void deleteByEmail(String email);
    List<RecruiterInvitation> findAllByOrderByCreatedAtDesc();
}
