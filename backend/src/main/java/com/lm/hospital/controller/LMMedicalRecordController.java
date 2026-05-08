package com.lm.hospital.controller;

import com.lm.hospital.model.LMMedicalRecord;
import com.lm.hospital.model.LMDoctor;
import com.lm.hospital.model.LMNotification;
import com.lm.hospital.model.LMNotificationType;
import com.lm.hospital.model.LMPatient;
import com.lm.hospital.model.LMRole;
import com.lm.hospital.model.LMUser;
import com.lm.hospital.repository.LMDoctorRepository;
import com.lm.hospital.repository.LMMedicalRecordRepository;
import com.lm.hospital.repository.LMNotificationRepository;
import com.lm.hospital.repository.LMPatientRepository;
import com.lm.hospital.repository.LMUserRepository;
import com.lm.hospital.service.LMEmailNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lm/medical-records")
@CrossOrigin(origins = "*", maxAge = 3600)
public class LMMedicalRecordController {

    @Autowired
    private LMMedicalRecordRepository medicalRecordRepository;
    @Autowired
    private LMPatientRepository patientRepository;
    @Autowired
    private LMDoctorRepository doctorRepository;
    @Autowired
    private LMUserRepository userRepository;
    @Autowired
    private LMNotificationRepository notificationRepository;
    @Autowired
    private LMEmailNotificationService emailNotificationService;

    @GetMapping
    public List<LMMedicalRecord> getAllRecords(Authentication authentication) {
        LMUser user = getCurrentUser(authentication);
        if (user.getRole() == LMRole.DOCTOR) {
            LMDoctor doctor = getDoctorProfile(user);
            return medicalRecordRepository.findByDoctorIdOrderByRecordDateDescIdDesc(doctor.getId());
        }
        if (user.getRole() == LMRole.PATIENT) {
            List<Long> patientIds = patientRepository.findByUserId(user.getId()).stream()
                    .map(LMPatient::getId)
                    .toList();
            if (patientIds.isEmpty()) return List.of();
            return medicalRecordRepository.findByPatientIdInOrderByRecordDateDesc(patientIds);
        }
        return medicalRecordRepository.findAllByOrderByRecordDateDescIdDesc();
    }

    @GetMapping("/{id}")
    public ResponseEntity<LMMedicalRecord> getById(@PathVariable Long id) {
        return medicalRecordRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/patient/{patientId}")
    public List<LMMedicalRecord> getByPatient(@PathVariable Long patientId) {
        return medicalRecordRepository.findByPatientIdOrderByRecordDateDesc(patientId);
    }

    @GetMapping("/doctor/{doctorId}")
    public List<LMMedicalRecord> getByDoctor(@PathVariable Long doctorId) {
        return medicalRecordRepository.findByDoctorIdOrderByRecordDateDescIdDesc(doctorId);
    }

    @PostMapping
    @PreAuthorize("hasRole('NURSE')")
    public ResponseEntity<LMMedicalRecord> createRecord(@RequestBody LMMedicalRecord record,
                                                        Authentication authentication) {
        LMUser sender = getCurrentUser(authentication);
        fillPatientAndDoctorNames(record);
        LMMedicalRecord saved = medicalRecordRepository.save(record);
        sendPatientNotification(saved.getPatientId(), sender, "Medical Record Added",
                "A new medical record has been added to your profile.",
                LMNotificationType.MEDICAL_RECORD_UPDATE, saved.getId());
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('DOCTOR','NURSE')")
    public ResponseEntity<LMMedicalRecord> updateRecord(@PathVariable Long id,
                                                        @RequestBody LMMedicalRecord record,
                                                        Authentication authentication) {
        return medicalRecordRepository.findById(id).map(existing -> {
            LMUser sender = getCurrentUser(authentication);

            LMMedicalRecord saved;
            if (sender.getRole() == LMRole.DOCTOR) {
                LMDoctor doctor = getDoctorProfile(sender);
                if (!doctor.getId().equals(existing.getDoctorId())) {
                    return ResponseEntity.status(403).<LMMedicalRecord>build();
                }
                existing.setPrescription(record.getPrescription());
                existing.setNotes(record.getNotes());
                existing.setFollowUpDate(record.getFollowUpDate());
                saved = medicalRecordRepository.save(existing);
            } else if (sender.getRole() == LMRole.NURSE) {
                record.setId(id);
                record.setRecordDate(existing.getRecordDate());
                fillPatientAndDoctorNames(record);
                saved = medicalRecordRepository.save(record);
            } else {
                return ResponseEntity.status(403).<LMMedicalRecord>build();
            }

            sendPatientNotification(saved.getPatientId(), sender, "Medical Record Updated",
                    "Your medical record has been updated.",
                    LMNotificationType.MEDICAL_RECORD_UPDATE, saved.getId());
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('NURSE')")
    public ResponseEntity<?> deleteRecord(@PathVariable Long id) {
        return medicalRecordRepository.findById(id).map(r -> {
            medicalRecordRepository.delete(r);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    private LMUser getCurrentUser(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseGet(() -> userRepository.findByEmail(authentication.getName())
                        .orElseThrow(() -> new RuntimeException("User not found")));
    }

    private LMDoctor getDoctorProfile(LMUser user) {
        return doctorRepository.findByUserId(user.getId())
                .or(() -> doctorRepository.findByEmail(user.getEmail()))
                .or(() -> doctorRepository.findByUsername(user.getUsername()))
                .orElseThrow(() -> new RuntimeException("Doctor profile not found"));
    }

    private void fillPatientAndDoctorNames(LMMedicalRecord record) {
        if (record.getPatientId() != null) {
            patientRepository.findById(record.getPatientId())
                    .ifPresent(patient -> record.setPatientName(patient.getFullName()));
        }
        if (record.getDoctorId() != null) {
            doctorRepository.findById(record.getDoctorId())
                    .ifPresent(doctor -> record.setDoctorName(doctor.getFullName()));
        }
    }

    private void sendPatientNotification(Long patientId, LMUser sender, String title, String message,
                                         LMNotificationType type, Long referenceId) {
        patientRepository.findById(patientId)
                .ifPresent(patient -> {
                    emailNotificationService.sendPatientEmail(patient, title, message);
                });
    }
}
