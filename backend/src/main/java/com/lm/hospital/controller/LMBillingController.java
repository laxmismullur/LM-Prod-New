package com.lm.hospital.controller;

import com.lm.hospital.model.*;
import com.lm.hospital.repository.LMBillingRepository;
import com.lm.hospital.repository.LMNotificationRepository;
import com.lm.hospital.repository.LMPatientRepository;
import com.lm.hospital.repository.LMUserRepository;
import com.lm.hospital.service.LMEmailNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/lm/billing")
@CrossOrigin(origins = "*", maxAge = 3600)
public class LMBillingController {

    @Autowired
    private LMBillingRepository billingRepository;
    @Autowired
    private LMPatientRepository patientRepository;
    @Autowired
    private LMUserRepository userRepository;
    @Autowired
    private LMNotificationRepository notificationRepository;
    @Autowired
    private LMEmailNotificationService emailNotificationService;

    @GetMapping
    public List<LMBilling> getAllBills(Authentication authentication) {
        LMUser user = getCurrentUser(authentication);
        if (user.getRole() == LMRole.PATIENT) {
            List<Long> patientIds = patientRepository.findByUserId(user.getId()).stream()
                    .map(LMPatient::getId)
                    .toList();
            if (patientIds.isEmpty()) return List.of();
            return billingRepository.findByPatientIdInOrderByCreatedAtDescIdDesc(patientIds);
        }
        return billingRepository.findAllByOrderByCreatedAtDescIdDesc();
    }

    @GetMapping("/{id}")
    public ResponseEntity<LMBilling> getById(@PathVariable Long id) {
        return billingRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/patient/{patientId}")
    public List<LMBilling> getByPatient(@PathVariable Long patientId) {
        return billingRepository.findByPatientIdOrderByCreatedAtDescIdDesc(patientId);
    }

    @GetMapping("/pending")
    public List<LMBilling> getPendingBills() {
        return billingRepository.findByPaymentStatusOrderByCreatedAtDescIdDesc(LMPaymentStatus.PENDING);
    }

    @PostMapping
    public ResponseEntity<LMBilling> createBill(@RequestBody LMBilling billing, Authentication authentication) {
        billing.setInvoiceNumber("LM-INV-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        LMUser sender = getCurrentUser(authentication);
        LMBilling saved = billingRepository.save(billing);
        sendPatientNotification(saved.getPatientId(), sender, "Billing Created",
                "A new bill " + saved.getInvoiceNumber() + " has been created for you.",
                LMNotificationType.BILLING_UPDATE, saved.getId());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<LMBilling> updateBill(@PathVariable Long id,
                                                @RequestBody LMBilling billing,
                                                Authentication authentication) {
        return billingRepository.findById(id).map(existing -> {
            billing.setId(id);
            billing.setInvoiceNumber(existing.getInvoiceNumber());
            billing.setCreatedAt(existing.getCreatedAt());
            LMBilling saved = billingRepository.save(billing);
            sendPatientNotification(saved.getPatientId(), getCurrentUser(authentication), "Billing Updated",
                    "Your bill " + saved.getInvoiceNumber() + " has been updated.",
                    LMNotificationType.BILLING_UPDATE, saved.getId());
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/pay")
    public ResponseEntity<LMBilling> markAsPaid(@PathVariable Long id, Authentication authentication) {
        return billingRepository.findById(id).map(b -> {
            b.setPaymentStatus(LMPaymentStatus.PAID);
            b.setPaidAmount(b.getTotalAmount());
            b.setPaidAt(LocalDateTime.now());
            LMBilling saved = billingRepository.save(b);
            sendPatientNotification(saved.getPatientId(), getCurrentUser(authentication), "Payment Updated",
                    "Your bill " + saved.getInvoiceNumber() + " has been marked as paid.",
                    LMNotificationType.BILLING_UPDATE, saved.getId());
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteBill(@PathVariable Long id) {
        return billingRepository.findById(id).map(b -> {
            billingRepository.delete(b);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    private LMUser getCurrentUser(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseGet(() -> userRepository.findByEmail(authentication.getName())
                        .orElseThrow(() -> new RuntimeException("User not found")));
    }

    private void sendPatientNotification(Long patientId, LMUser sender, String title, String message,
                                         LMNotificationType type, Long referenceId) {
        patientRepository.findById(patientId)
                .ifPresent(patient -> {
                    emailNotificationService.sendPatientEmail(patient, title, message);
                });
    }
}
