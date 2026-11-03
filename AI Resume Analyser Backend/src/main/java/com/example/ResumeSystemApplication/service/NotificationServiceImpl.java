package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.NotificationDto;
import com.example.ResumeSystemApplication.model.Notification;
import com.example.ResumeSystemApplication.model.User;
import com.example.ResumeSystemApplication.repository.NotificationRepository;
import com.example.ResumeSystemApplication.repository.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@Slf4j
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepository;
    private final AuthService authService;
    private final UserRepository userRepository;

    public NotificationServiceImpl(NotificationRepository notificationRepository,
                                   AuthService authService,
                                   UserRepository userRepository) {
        this.notificationRepository = notificationRepository;
        this.authService = authService;
        this.userRepository = userRepository;
    }

    @Override
    public List<NotificationDto> getCurrentUserNotifications() {
        try {
            User user = authService.getCurrentUser();
            if (user == null) return Collections.emptyList();

            return notificationRepository.findByUserIdOrderByCreatedAtDesc(user.getId()).stream()
                    .map(n -> NotificationDto.builder()
                            .id(n.getId())
                            .title(n.getTitle())
                            .message(n.getMessage())
                            .type(n.getType())
                            .link(n.getLink())
                            .isRead(n.isRead())
                            .createdAt(n.getCreatedAt())
                            .build())
                    .collect(Collectors.toList());
        } catch (Exception e) {
            log.warn("Failed to load notifications for current user", e);
            return Collections.emptyList();
        }
    }

    @Override
    @Transactional
    public void markNotificationAsRead(Long id) {
        try {
            User user = authService.getCurrentUser();
            notificationRepository.findById(id).ifPresent(n -> {
                if (n.getUser() != null && n.getUser().getId().equals(user.getId())) {
                    n.setRead(true);
                    notificationRepository.save(n);
                }
            });
        } catch (Exception e) {
            log.warn("Failed to mark notification {} as read", id, e);
        }
    }

    @Override
    @Transactional
    public void markAllNotificationsAsRead() {
        try {
            User user = authService.getCurrentUser();
            if (user != null) {
                notificationRepository.markAllAsReadForUser(user.getId());
            }
        } catch (Exception e) {
            log.warn("Failed to mark all notifications as read", e);
        }
    }

    @Override
    @Transactional
    public void notifyUser(User user, String title, String message, String type, String link) {
        if (user == null) return;
        try {
            Notification notif = new Notification();
            notif.setUser(user);
            notif.setTitle(title);
            notif.setMessage(message);
            notif.setType(type);
            notif.setLink(link);
            notificationRepository.save(notif);
        } catch (Exception e) {
            log.warn("Failed to save notification for user {}", user.getUsername(), e);
        }
    }

    @Override
    @Transactional
    public void notifyAdmins(String title, String message, String type, String link) {
        try {
            List<User> admins = userRepository.findByRolesName("ROLE_ADMIN");
            for (User admin : admins) {
                notifyUser(admin, title, message, type, link);
            }
        } catch (Exception e) {
            log.warn("Failed to notify admins", e);
        }
    }

    @Override
    public long getUnreadCount() {
        try {
            User user = authService.getCurrentUser();
            if (user == null) return 0;
            return notificationRepository.countByUserIdAndIsReadFalse(user.getId());
        } catch (Exception e) {
            return 0;
        }
    }
}
