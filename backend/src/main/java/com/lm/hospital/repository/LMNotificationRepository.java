package com.lm.hospital.repository;

import com.lm.hospital.model.LMNotification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LMNotificationRepository extends JpaRepository<LMNotification, Long> {
    List<LMNotification> findByRecipientIdOrderByCreatedAtDesc(Long recipientId);
    List<LMNotification> findByRecipientIdAndReadFalseOrderByCreatedAtDesc(Long recipientId);
    long countByRecipientIdAndReadFalse(Long recipientId);
}