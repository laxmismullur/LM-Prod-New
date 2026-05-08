package com.lm.hospital.controller;

import com.lm.hospital.model.LMNotification;
import com.lm.hospital.model.LMNotificationType;
import com.lm.hospital.model.LMRole;
import com.lm.hospital.model.LMUser;
import com.lm.hospital.repository.LMNotificationRepository;
import com.lm.hospital.repository.LMUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/lm/notifications")
@CrossOrigin(origins = "*", maxAge = 3600)
public class LMNotificationController {

    @Autowired
    private LMNotificationRepository notificationRepository;

    @Autowired
    private LMUserRepository userRepository;

    @GetMapping
    public List<LMNotification> getMyNotifications(Authentication authentication) {
        LMUser user = getCurrentUser(authentication);
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(user.getId());
    }

    @GetMapping("/unread")
    public List<LMNotification> getUnreadNotifications(Authentication authentication) {
        LMUser user = getCurrentUser(authentication);
        return notificationRepository.findByRecipientIdAndReadFalseOrderByCreatedAtDesc(user.getId());
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount(Authentication authentication) {
        LMUser user = getCurrentUser(authentication);
        long count = notificationRepository.countByRecipientIdAndReadFalse(user.getId());
        return ResponseEntity.ok(Map.of("count", count));
    }

    @PostMapping
    public ResponseEntity<LMNotification> sendNotification(
            @RequestBody LMNotification notification,
            Authentication authentication) {

        // Set sender information
        LMUser sender = getCurrentUser(authentication);
        if (!canSendNotification(sender)) {
            return ResponseEntity.status(403).build();
        }

        notification.setSenderId(sender.getId());
        notification.setSenderName(sender.getFullName());

        // Validate recipient exists
        LMUser recipient = userRepository.findById(notification.getRecipientId())
                .orElseThrow(() -> new RuntimeException("Recipient not found"));

        notification.setRecipientName(recipient.getFullName());

        return ResponseEntity.ok(notificationRepository.save(notification));
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id, Authentication authentication) {
        LMUser user = getCurrentUser(authentication);

        return notificationRepository.findById(id).map(notification -> {
            // Ensure the notification belongs to the current user
            if (!notification.getRecipientId().equals(user.getId())) {
                return ResponseEntity.notFound().build();
            }

            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
            return ResponseEntity.ok(notificationRepository.save(notification));
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/mark-all-read")
    public ResponseEntity<?> markAllAsRead(Authentication authentication) {
        LMUser user = getCurrentUser(authentication);

        List<LMNotification> unreadNotifications = notificationRepository
                .findByRecipientIdAndReadFalseOrderByCreatedAtDesc(user.getId());

        unreadNotifications.forEach(notification -> {
            notification.setRead(true);
            notification.setReadAt(LocalDateTime.now());
        });

        notificationRepository.saveAll(unreadNotifications);

        return ResponseEntity.ok().body(Map.of("message", "All notifications marked as read"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteNotification(@PathVariable Long id, Authentication authentication) {
        LMUser user = getCurrentUser(authentication);

        return notificationRepository.findById(id).map(notification -> {
            // Ensure the notification belongs to the current user
            if (!notification.getRecipientId().equals(user.getId())) {
                return ResponseEntity.notFound().build();
            }

            notificationRepository.delete(notification);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    private LMUser getCurrentUser(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseGet(() -> userRepository.findByEmail(authentication.getName())
                        .orElseThrow(() -> new RuntimeException("User not found")));
    }

    private boolean canSendNotification(LMUser user) {
        return user != null && (user.getRole() == LMRole.ADMIN
                || user.getRole() == LMRole.DOCTOR
                || user.getRole() == LMRole.RECEPTIONIST);
    }
}
