package com.lm.hospital.controller;

import com.lm.hospital.model.*;
import com.lm.hospital.repository.*;
import com.lm.hospital.service.LMEmailNotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

@RestController
@RequestMapping("/api/lm/appointments")
@CrossOrigin(origins = "*", maxAge = 3600)
public class LMAppointmentController {

    @Autowired private LMAppointmentRepository appointmentRepository;
    @Autowired private LMDoctorRepository doctorRepository;
    @Autowired private LMPatientRepository patientRepository;
    @Autowired private LMNotificationRepository notificationRepository;
    @Autowired private LMUserRepository userRepository;
    @Autowired private LMEmailNotificationService emailNotificationService;

    // ===================== VIEW =====================

    @GetMapping
    public List<LMAppointment> getAllAppointments(Authentication authentication) {
        return getAppointmentsForCurrentUser(authentication);
    }

    @GetMapping("/{id}")
    public ResponseEntity<LMAppointment> getById(@PathVariable Long id, Authentication authentication) {
        return appointmentRepository.findById(id)
                .filter(a -> canAccessAppointment(authentication, a))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/doctor/{doctorId}")
    public List<LMAppointment> getByDoctor(@PathVariable Long doctorId) {
        return appointmentRepository.findByDoctorIdOrderByCreatedAtDescIdDesc(doctorId);
    }

    @GetMapping("/patient/{patientId}")
    public List<LMAppointment> getByPatient(@PathVariable Long patientId) {
        return appointmentRepository.findByPatientIdOrderByCreatedAtDescIdDesc(patientId);
    }

    @GetMapping("/today")
    public List<LMAppointment> getTodayAppointments(Authentication authentication) {
        LocalDateTime start = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime end = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);

        LMUser user = getCurrentUser(authentication);
        if (user.getRole() == LMRole.DOCTOR) {
            LMDoctor doctor = getDoctorProfile(user);
            return appointmentRepository.findByDoctorIdAndAppointmentDateBetween(doctor.getId(), start, end);
        }
        if (user.getRole() == LMRole.PATIENT) {
            List<Long> patientIds = getCurrentPatientIds(user);
            if (patientIds.isEmpty()) return List.of();
            return appointmentRepository.findByPatientIdIn(patientIds).stream()
                    .filter(a -> !a.getAppointmentDate().isBefore(start) && !a.getAppointmentDate().isAfter(end))
                    .toList();
        }
        return appointmentRepository.findByAppointmentDateBetween(start, end);
    }

    @GetMapping("/upcoming")
    public List<LMAppointment> getUpcoming(Authentication authentication) {
        LMUser user = getCurrentUser(authentication);
        if (user.getRole() == LMRole.DOCTOR) {
            LMDoctor doctor = getDoctorProfile(user);
            return appointmentRepository.findByDoctorIdAndAppointmentDateAfterAndStatusNot(
                    doctor.getId(), LocalDateTime.now(), LMAppointmentStatus.CANCELLED);
        }
        if (user.getRole() == LMRole.PATIENT) {
            List<Long> patientIds = getCurrentPatientIds(user);
            if (patientIds.isEmpty()) return List.of();
            return appointmentRepository.findByPatientIdInAndAppointmentDateAfterAndStatusNot(
                    patientIds, LocalDateTime.now(), LMAppointmentStatus.CANCELLED);
        }
        return appointmentRepository.findByAppointmentDateAfterAndStatusNot(
                LocalDateTime.now(), LMAppointmentStatus.CANCELLED);
    }

    @GetMapping({"/user", "/my"})
    public List<LMAppointment> getMyAppointments(Authentication authentication) {
        return getAppointmentsForCurrentUser(authentication);
    }

    // ===================== CREATE =====================

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST','PATIENT')")
    public ResponseEntity<?> createAppointment(@RequestBody LMAppointment appointment,
                                               Authentication authentication) {

        // Extra backend safety
        String username = authentication.getName();
        LMUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!List.of(LMRole.ADMIN, LMRole.RECEPTIONIST, LMRole.PATIENT).contains(user.getRole())) {
            return ResponseEntity.status(403).body("Only admin, receptionist, or patient can book appointment");
        }

        // Auto doctor details
        if (appointment.getDoctorId() != null) {
            doctorRepository.findById(appointment.getDoctorId()).ifPresent(d -> {
                appointment.setDoctorName(d.getFullName());
                appointment.setDoctorCode(d.getDoctorCode());
                appointment.setDepartment(d.getDepartment());
                appointment.setSpecialization(d.getSpecialization());
            });
        }

        LMPatient patient;
        if (user.getRole() == LMRole.PATIENT) {
            List<LMPatient> currentPatients = patientRepository.findByUserId(user.getId());
            if (currentPatients.isEmpty()) {
                return ResponseEntity.status(403).body("Create your patient profile before booking an appointment");
            }

            patient = currentPatients.stream()
                    .filter(p -> p.getId().equals(appointment.getPatientId()))
                    .findFirst()
                    .orElse(null);

            if (patient == null) {
                return ResponseEntity.status(403).body("Appointment patient must belong to the logged-in user");
            }
        } else {
            if (appointment.getPatientId() == null) {
                return ResponseEntity.badRequest().body("Patient is required");
            }
            patient = patientRepository.findById(appointment.getPatientId())
                    .orElseThrow(() -> new RuntimeException("Patient not found"));
        }

        appointment.setPatientId(patient.getId());
        appointment.setPatientName(patient.getFullName());
        appointment.setStatus(LMAppointmentStatus.SCHEDULED);

        LMAppointment savedAppointment = appointmentRepository.save(appointment);

        // Notification
        sendAppointmentNotification(savedAppointment,
                LMNotificationType.APPOINTMENT_BOOKED,
                "Appointment Booked",
                authentication);

        return ResponseEntity.ok(savedAppointment);
    }

    // ===================== UPDATE BOOKING DETAILS (ADMIN / RECEPTIONIST ONLY) =====================

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST')")
    public ResponseEntity<LMAppointment> updateAppointment(@PathVariable Long id,
                                                           @RequestBody LMAppointment appointment,
                                                           Authentication authentication) {

        return appointmentRepository.findById(id).map(existing -> {
            appointment.setId(id);
            appointment.setCreatedAt(existing.getCreatedAt());
            appointment.setStatus(existing.getStatus());
            appointment.setDoctorNotes(existing.getDoctorNotes());

            if (appointment.getPatientId() != null) {
                patientRepository.findById(appointment.getPatientId()).ifPresent(p -> {
                    appointment.setPatientId(p.getId());
                    appointment.setPatientName(p.getFullName());
                });
            } else {
                appointment.setPatientId(existing.getPatientId());
                appointment.setPatientName(existing.getPatientName());
            }

            if (appointment.getDoctorId() != null) {
                doctorRepository.findById(appointment.getDoctorId()).ifPresent(d -> {
                    appointment.setDoctorName(d.getFullName());
                    appointment.setDoctorCode(d.getDoctorCode());
                    appointment.setDepartment(d.getDepartment());
                    appointment.setSpecialization(d.getSpecialization());
                });
            } else {
                appointment.setDoctorId(existing.getDoctorId());
                appointment.setDoctorName(existing.getDoctorName());
                appointment.setDoctorCode(existing.getDoctorCode());
                appointment.setDepartment(existing.getDepartment());
                appointment.setSpecialization(existing.getSpecialization());
            }

            return ResponseEntity.ok(appointmentRepository.save(appointment));

        }).orElse(ResponseEntity.notFound().build());
    }

    // ===================== STATUS UPDATE (DOCTOR ONLY) =====================

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<LMAppointment> updateStatus(@PathVariable Long id,
                                                     @RequestParam LMAppointmentStatus status,
                                                     @RequestParam(required = false) String doctorNotes,
                                                     Authentication authentication) {

        return appointmentRepository.findById(id).map(a -> {
            if (!isCurrentDoctorAppointment(authentication, a)) {
                return ResponseEntity.status(403).<LMAppointment>build();
            }

            LMAppointmentStatus oldStatus = a.getStatus();
            a.setStatus(status);

            if (doctorNotes != null) {
                a.setDoctorNotes(doctorNotes);
            }

            LMAppointment savedAppointment = appointmentRepository.save(a);

            // Notifications
            if (status == LMAppointmentStatus.CONFIRMED && oldStatus != LMAppointmentStatus.CONFIRMED) {
                sendAppointmentNotification(savedAppointment,
                        LMNotificationType.APPOINTMENT_CONFIRMED,
                        "Appointment Confirmed",
                        authentication);

            } else if (status == LMAppointmentStatus.CANCELLED && oldStatus != LMAppointmentStatus.CANCELLED) {
                sendAppointmentNotification(savedAppointment,
                        LMNotificationType.APPOINTMENT_CANCELLED,
                        "Appointment Cancelled",
                        authentication);
            } else if (oldStatus != status) {
                sendAppointmentNotification(savedAppointment,
                        LMNotificationType.GENERAL,
                        "Appointment Updated",
                        authentication);
            }

            return ResponseEntity.ok(savedAppointment);

        }).orElse(ResponseEntity.notFound().build());
    }

    // ===================== DELETE =====================

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN','RECEPTIONIST')")
    public ResponseEntity<?> deleteAppointment(@PathVariable Long id, Authentication authentication) {

        return appointmentRepository.findById(id).map(a -> {
            appointmentRepository.delete(a);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    private List<LMAppointment> getAppointmentsForCurrentUser(Authentication authentication) {
        LMUser user = getCurrentUser(authentication);

        if (user.getRole() == LMRole.DOCTOR) {
            LMDoctor doctor = getDoctorProfile(user);
            return appointmentRepository.findByDoctorIdOrderByCreatedAtDescIdDesc(doctor.getId());
        }

        if (user.getRole() == LMRole.PATIENT) {
            List<Long> patientIds = getCurrentPatientIds(user);
            if (patientIds.isEmpty()) return List.of();
            return appointmentRepository.findByPatientIdInOrderByCreatedAtDescIdDesc(patientIds);
        }

        return appointmentRepository.findAllByOrderByCreatedAtDescIdDesc();
    }

    private LMUser getCurrentUser(Authentication authentication) {
        if (authentication == null) {
            throw new RuntimeException("Unauthenticated");
        }
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

    private List<Long> getCurrentPatientIds(LMUser user) {
        return patientRepository.findByUserId(user.getId()).stream()
                .map(LMPatient::getId)
                .toList();
    }

    private boolean isCurrentDoctorAppointment(Authentication authentication, LMAppointment appointment) {
        LMUser user = getCurrentUser(authentication);
        if (user.getRole() != LMRole.DOCTOR) return false;
        LMDoctor doctor = getDoctorProfile(user);
        return doctor.getId().equals(appointment.getDoctorId());
    }

    private boolean canAccessAppointment(Authentication authentication, LMAppointment appointment) {
        LMUser user = getCurrentUser(authentication);
        if (user.getRole() == LMRole.ADMIN || user.getRole() == LMRole.RECEPTIONIST) return true;
        if (user.getRole() == LMRole.DOCTOR) {
            LMDoctor doctor = getDoctorProfile(user);
            return doctor.getId().equals(appointment.getDoctorId());
        }
        if (user.getRole() == LMRole.PATIENT) {
            return getCurrentPatientIds(user).contains(appointment.getPatientId());
        }
        return false;
    }

    // ===================== NOTIFICATION =====================

    private void sendAppointmentNotification(LMAppointment appointment,
                                             LMNotificationType type,
                                             String title,
                                             Authentication authentication) {

        try {
            LMPatient patient = patientRepository.findById(appointment.getPatientId()).orElse(null);
            if (patient == null) return;

            String senderUsername = authentication != null ? authentication.getName() : "system";
            LMUser sender = userRepository.findByUsername(senderUsername)
                    .or(() -> userRepository.findByEmail(senderUsername))
                    .orElse(null);
            if (sender == null) return;

            DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd, yyyy 'at' hh:mm a");
            String formattedDate = appointment.getAppointmentDate().format(formatter);

            String message;

            switch (type) {
                case APPOINTMENT_BOOKED:
                    message = "Your appointment with " + appointment.getDoctorName() +
                            " has been booked for " + formattedDate;
                    break;

                case APPOINTMENT_CONFIRMED:
                    message = "Your appointment with " + appointment.getDoctorName() +
                            " on " + formattedDate + " has been confirmed.";
                    break;

                case APPOINTMENT_CANCELLED:
                    message = "Your appointment with " + appointment.getDoctorName() +
                            " on " + formattedDate + " has been cancelled.";
                    break;

                default:
                    message = "Your appointment with " + appointment.getDoctorName() +
                            " on " + formattedDate + " has been updated to " + appointment.getStatus() + ".";
            }

            emailNotificationService.sendPatientEmail(patient, title, message);

        } catch (Exception e) {
            System.err.println("Notification error: " + e.getMessage());
        }
    }
}
