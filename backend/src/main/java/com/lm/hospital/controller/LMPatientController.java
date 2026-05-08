package com.lm.hospital.controller;

import com.lm.hospital.model.LMDoctor;
import com.lm.hospital.model.LMNotification;
import com.lm.hospital.model.LMNotificationType;
import com.lm.hospital.model.LMPatient;
import com.lm.hospital.model.LMPatientStatus;
import com.lm.hospital.model.LMUser;
import com.lm.hospital.repository.LMDoctorRepository;
import com.lm.hospital.repository.LMNotificationRepository;
import com.lm.hospital.repository.LMPatientRepository;
import com.lm.hospital.repository.LMUserRepository;
import com.lm.hospital.service.LMEmailNotificationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/lm/patients")
@CrossOrigin(origins = "*", maxAge = 3600)
public class LMPatientController {

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
    @Autowired
    private PasswordEncoder passwordEncoder;

    @GetMapping
    public List<LMPatient> getAllPatients(Authentication authentication) {
        LMUser user = getCurrentUser(authentication);
        if (user.getRole().name().equals("PATIENT")) {
            return withLoginUsernames(patientRepository.findByUserIdOrderByRegisteredAtDescIdDesc(user.getId()));
        }
        if (user.getRole().name().equals("DOCTOR")) {
            LMDoctor doctor = doctorRepository.findByUserId(user.getId())
                    .or(() -> doctorRepository.findByEmail(user.getEmail()))
                    .or(() -> doctorRepository.findByUsername(user.getUsername()))
                    .orElseThrow(() -> new RuntimeException("Doctor profile not found"));
            return withLoginUsernames(patientRepository.findByAssignedDoctorIdOrderByRegisteredAtDescIdDesc(doctor.getId()));
        }
        return withLoginUsernames(patientRepository.findAllByOrderByRegisteredAtDescIdDesc());
    }

    @GetMapping("/{id}")
    public ResponseEntity<LMPatient> getPatientById(@PathVariable Long id) {
        return patientRepository.findById(id)
                .map(this::withLoginUsername)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/profile")
    @PreAuthorize("hasRole('PATIENT')")
    public ResponseEntity<LMPatient> getMyProfile(Authentication authentication) {
        LMUser user = getCurrentUser(authentication);
        return patientRepository.findFirstByUserId(user.getId())
                .or(() -> patientRepository.findByEmail(user.getEmail()))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public List<LMPatient> searchPatients(@RequestParam String name) {
        return patientRepository.findByFullNameContainingIgnoreCase(name);
    }

    @GetMapping("/doctor/{doctorId}")
    public List<LMPatient> getPatientsByDoctor(@PathVariable Long doctorId) {
        return patientRepository.findByAssignedDoctorIdOrderByRegisteredAtDescIdDesc(doctorId);
    }

    @GetMapping("/user")
    @PreAuthorize("hasRole('PATIENT')")
    public List<LMPatient> getPatientsByCurrentUser(Authentication authentication) {
        LMUser user = getCurrentUser(authentication);
        return patientRepository.findByUserIdOrderByRegisteredAtDescIdDesc(user.getId());
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST','PATIENT')")
    public ResponseEntity<?> createPatient(@Valid @RequestBody LMPatient patient, Authentication authentication) {
        patient.setPatientId("LMP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        LMUser sender = authentication != null ? getCurrentUser(authentication) : null;
        String loginUsername = patient.getUsername();
        String plainPassword = patient.getPassword();

        // Link patient to current user if they are a patient
        if (authentication != null) {
            LMUser user = sender;
            if (user != null && "PATIENT".equals(user.getRole().name())) {
                patient.setUserId(user.getId());
            } else if (user != null && canManagePatients(user)) {
                String syncError = syncPatientUser(patient, patient.getUsername(), patient.getPassword());
                if (syncError != null) {
                    return ResponseEntity.badRequest().body(syncError);
                }
            }
        }

        // Auto-resolve doctor name from doctor table
        if (patient.getAssignedDoctorId() != null) {
            doctorRepository.findById(patient.getAssignedDoctorId()).ifPresent(d -> {
                patient.setAssignedDoctorName(d.getFullName());
                patient.setAssignedDoctorCode(d.getDoctorCode());
                patient.setAssignedDoctorSpecialization(d.getSpecialization());
            });
        }
        LMPatient saved = patientRepository.save(patient);

        if (sender != null && canManagePatients(sender)) {
            sendPatientNotification(saved, sender, "Patient Registration Complete",
                    "Your patient profile has been created. Use the login credentials sent to your registered email.",
                    LMNotificationType.GENERAL, saved.getId());
            sendPatientCredentialsEmail(saved, loginUsername, plainPassword);
        }

        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}")
    public ResponseEntity<LMPatient> updatePatient(@PathVariable Long id, @Valid @RequestBody LMPatient patient,
                                                   Authentication authentication) {
        LMUser sender = getCurrentUser(authentication);
        if (!canManagePatients(sender)) {
            return ResponseEntity.status(403).build();
        }

        return patientRepository.findById(id).map(existing -> {
            Long existingUserId = existing.getUserId();
            LMPatientStatus oldStatus = existing.getStatus();
            Long oldDoctorId = existing.getAssignedDoctorId();
            patient.setId(id);
            patient.setPatientId(existing.getPatientId());
            patient.setRegisteredAt(existing.getRegisteredAt());
            patient.setUserId(existingUserId);
            if (patient.getAssignedDoctorId() != null) {
                doctorRepository.findById(patient.getAssignedDoctorId()).ifPresent(d -> {
                    patient.setAssignedDoctorName(d.getFullName());
                    patient.setAssignedDoctorCode(d.getDoctorCode());
                    patient.setAssignedDoctorSpecialization(d.getSpecialization());
                });
            } else {
                patient.setAssignedDoctorName(null);
                patient.setAssignedDoctorCode(null);
            }
            String syncError = syncPatientUser(patient, patient.getUsername(), patient.getPassword());
            if (syncError != null) {
                return ResponseEntity.badRequest().<LMPatient>build();
            }
            LMPatient saved = patientRepository.save(patient);
            String message = "Your patient profile has been updated by " + sender.getFullName() + ".";
            if (oldStatus != saved.getStatus()) {
                message = "Your patient status has been updated to " + saved.getStatus() + ".";
            } else if (oldDoctorId == null ? saved.getAssignedDoctorId() != null : !oldDoctorId.equals(saved.getAssignedDoctorId())) {
                message = "Your assigned doctor has been updated to "
                        + (saved.getAssignedDoctorName() != null ? saved.getAssignedDoctorName() : "a new doctor") + ".";
            }
            sendPatientNotification(saved, sender, "Patient Profile Updated", message,
                    LMNotificationType.GENERAL, saved.getId());
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<LMPatient> updateStatus(@PathVariable Long id, @RequestParam LMPatientStatus status,
                                                  Authentication authentication) {
        LMUser sender = getCurrentUser(authentication);
        if (!canManagePatients(sender)) {
            return ResponseEntity.status(403).build();
        }

        return patientRepository.findById(id).map(p -> {
            p.setStatus(status);
            LMPatient saved = patientRepository.save(p);
            sendPatientNotification(saved, sender, "Patient Status Updated",
                    "Your patient status has been updated to " + saved.getStatus() + ".",
                    LMNotificationType.GENERAL, saved.getId());
            return ResponseEntity.ok(saved);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePatient(@PathVariable Long id, Authentication authentication) {
        LMUser sender = getCurrentUser(authentication);
        if (!canManagePatients(sender)) {
            return ResponseEntity.status(403).build();
        }

        return patientRepository.findById(id).map(p -> {
            patientRepository.delete(p);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    private LMUser getCurrentUser(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseGet(() -> userRepository.findByEmail(authentication.getName())
                        .orElseThrow(() -> new RuntimeException("User not found")));
    }

    private boolean canManagePatients(LMUser user) {
        return user != null && ("ADMIN".equals(user.getRole().name()) || "RECEPTIONIST".equals(user.getRole().name()));
    }

    private List<LMPatient> withLoginUsernames(List<LMPatient> patients) {
        patients.forEach(this::withLoginUsername);
        return patients;
    }

    private LMPatient withLoginUsername(LMPatient patient) {
        if (patient.getUserId() != null) {
            userRepository.findById(patient.getUserId()).ifPresent(user -> patient.setUsername(user.getUsername()));
        }
        return patient;
    }

    private String syncPatientUser(LMPatient patient, String username, String rawPassword) {
        if (patient.getEmail() == null || patient.getEmail().isBlank()
                || username == null || username.isBlank()) {
            return null;
        }

        LMUser user = null;
        if (patient.getUserId() != null) {
            user = userRepository.findById(patient.getUserId()).orElse(null);
        }

        var usernameOwner = userRepository.findByUsername(username.trim());
        if (usernameOwner.isPresent() && (user == null || !usernameOwner.get().getId().equals(user.getId()))) {
            return "Username already exists";
        }

        var emailOwner = userRepository.findByEmail(patient.getEmail());
        if (emailOwner.isPresent() && (user == null || !emailOwner.get().getId().equals(user.getId()))) {
            return "Email already exists";
        }

        if (user == null) {
            if (rawPassword == null || rawPassword.isBlank()) {
                return null;
            }
            user = LMUser.builder()
                    .role(com.lm.hospital.model.LMRole.PATIENT)
                    .active(true)
                    .build();
        }

        user.setUsername(username.trim());
        user.setFullName(patient.getFullName());
        user.setEmail(patient.getEmail());
        user.setPhone(patient.getPhone());
        user.setActive(true);
        if (rawPassword != null && !rawPassword.isBlank()) {
            user.setPassword(passwordEncoder.encode(rawPassword));
        }

        LMUser savedUser = userRepository.save(user);
        patient.setUserId(savedUser.getId());
        return null;
    }

    private void sendPatientCredentialsEmail(LMPatient patient, String loginUsername, String plainPassword) {
        if (patient.getEmail() == null || patient.getEmail().isBlank()
                || loginUsername == null || loginUsername.isBlank()
                || plainPassword == null || plainPassword.isBlank()) {
            System.err.println("Patient credentials email skipped because email, username, or password is missing. Patient ID: "
                    + patient.getId());
            return;
        }

        emailNotificationService.sendLoginCredentialsEmail(
                patient.getEmail(),
                patient.getFullName(),
                "Patient",
                loginUsername.trim(),
                plainPassword
        );
    }

    private void sendPatientNotification(LMPatient patient, LMUser sender, String title, String message,
                                         LMNotificationType type, Long referenceId) {
        if (patient == null || sender == null) {
            return;
        }

        emailNotificationService.sendPatientEmail(patient, title, message);
    }
}
