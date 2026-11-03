package com.example.ResumeSystemApplication.service;

import com.example.ResumeSystemApplication.dto.NotificationDto;
import com.example.ResumeSystemApplication.model.User;

import java.util.List;

public interface NotificationService {
    List<NotificationDto> getCurrentUserNotifications();
    void markNotificationAsRead(Long id);
    void markAllNotificationsAsRead();
    void notifyUser(User user, String title, String message, String type, String link);
    void notifyAdmins(String title, String message, String type, String link);
    long getUnreadCount();
}
