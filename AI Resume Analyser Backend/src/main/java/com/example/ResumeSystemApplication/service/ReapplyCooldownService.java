package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.model.Application;
import com.example.ResumeSystemApplication.model.Notification;
import com.example.ResumeSystemApplication.model.User;
import com.example.ResumeSystemApplication.repository.ApplicationRepository;
import com.example.ResumeSystemApplication.repository.NotificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ReapplyCooldownService {

    private static final Logger log = LoggerFactory.getLogger(ReapplyCooldownService.class);

    private final ApplicationRepository applicationRepository;
    private final EmailService emailService;
    private final NotificationRepository notificationRepository;

    public ReapplyCooldownService(
            ApplicationRepository applicationRepository,
            EmailService emailService,
            NotificationRepository notificationRepository
    ) {
        this.applicationRepository = applicationRepository;
        this.emailService = emailService;
        this.notificationRepository = notificationRepository;
    }

    /**
     * Periodically checks for candidate applications whose 3-month cooldown period has concluded,
     * dispatches the re-apply invitation email, and creates an in-app notification.
     * Fires hourly by default (configurable via reapply.cron).
     */
    @Scheduled(cron = "${reapply.cron:0 0 * * * *}")
    @Transactional
    public void processExpiredCooldowns() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime threeMonthsAgo = now.minusMonths(3);

        List<Application> eligibleApps = applicationRepository.findEligibleForReapplyEmail(now, threeMonthsAgo);
        if (eligibleApps.isEmpty()) {
            return;
        }

        log.info("Found {} candidate application(s) eligible for 3-month re-apply notification", eligibleApps.size());

        for (Application app : eligibleApps) {
            try {
                User candidate = app.getResume() != null ? app.getResume().getCandidate() : null;
                String candidateEmail = null;
                String candidateName = null;

                if (candidate != null) {
                    candidateEmail = candidate.getEmail();
                    candidateName = candidate.getFirstName() != null && !candidate.getFirstName().isBlank()
                            ? candidate.getFirstName()
                            : candidate.getUsername();
                }

                String jobTitle = app.getJob() != null ? app.getJob().getTitle() : "Career Opening";
                String companyName = (app.getJob() != null && app.getJob().getCreatedBy() != null && app.getJob().getCreatedBy().getCompanyName() != null && !app.getJob().getCreatedBy().getCompanyName().isBlank())
                        ? app.getJob().getCreatedBy().getCompanyName()
                        : "Hiring Organization";
                Long jobId = app.getJob() != null ? app.getJob().getId() : null;

                if (candidateEmail != null && !candidateEmail.isBlank()) {
                    emailService.sendReapplyInvitationEmail(candidateEmail, candidateName, jobTitle, companyName, jobId);
                }

                if (candidate != null) {
                    Notification notif = new Notification();
                    notif.setUser(candidate);
                    notif.setTitle("Eligible to Re-apply: " + jobTitle);
                    notif.setMessage("Your 3-month cooldown period for '" + jobTitle + "' at " + companyName + 
                            " has concluded! We invite you to submit your updated resume.");
                    notif.setType("RECOMMENDATION");
                    notif.setLink("/candidate/jobs");
                    notificationRepository.save(notif);
                }

                app.setReapplyEmailSent(true);
                applicationRepository.save(app);
                log.info("Successfully sent 3-month re-apply notification for application ID #{} to {}", app.getId(), candidateEmail);
            } catch (Exception ex) {
                log.error("Failed to process 3-month re-apply notification for application ID #{}", app.getId(), ex);
            }
        }
    }
}
