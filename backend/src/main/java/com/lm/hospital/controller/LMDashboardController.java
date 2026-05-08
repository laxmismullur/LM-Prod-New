package com.lm.hospital.controller;

import com.lm.hospital.dto.LMDashboardStats;
import com.lm.hospital.model.*;
import com.lm.hospital.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/lm/dashboard")
@CrossOrigin(origins = "*", maxAge = 3600)
public class LMDashboardController {

    @Autowired private LMPatientRepository patientRepository;
    @Autowired private LMAppointmentRepository appointmentRepository;
    @Autowired private LMMedicalRecordRepository medicalRecordRepository;
    @Autowired private LMUserRepository userRepository;
    @Autowired private LMDoctorRepository doctorRepository;

    @GetMapping("/stats")
    public ResponseEntity<LMDashboardStats> getStats() {
        LocalDateTime todayStart = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0);
        LocalDateTime todayEnd = LocalDateTime.now().withHour(23).withMinute(59).withSecond(59);
        List<LMAppointment> todayAppts = appointmentRepository.findByAppointmentDateBetween(todayStart, todayEnd);

        LMDashboardStats stats = LMDashboardStats.builder()
                .totalPatients(patientRepository.count())
                .activePatients(patientRepository.countByStatus(LMPatientStatus.ACTIVE))
                .criticalPatients(patientRepository.countByStatus(LMPatientStatus.CRITICAL))
                .admittedPatients(patientRepository.countByStatus(LMPatientStatus.ADMITTED))
                .todayAppointments((long) todayAppts.size())
                .pendingAppointments(appointmentRepository.countByStatus(LMAppointmentStatus.SCHEDULED))
                .completedAppointments(appointmentRepository.countByStatus(LMAppointmentStatus.COMPLETED))
                .totalDoctors(doctorRepository.count())
                .activeDoctors(doctorRepository.findByActiveTrue().size())
                .totalStaff(userRepository.count())
                .totalMedicalRecords(medicalRecordRepository.count())
                .totalRevenue(BigDecimal.ZERO)
                .collectedRevenue(BigDecimal.ZERO)
                .pendingBills(0L)
                .build();

        return ResponseEntity.ok(stats);
    }

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        return ResponseEntity.ok(userRepository.findAll());
    }

    @GetMapping("/activity")
    public ResponseEntity<?> getRecentActivity() {
        var recentPatients = patientRepository.findAll().stream()
                .sorted((a, b) -> b.getRegisteredAt().compareTo(a.getRegisteredAt()))
                .limit(5).toList();
        var recentAppts = appointmentRepository.findByAppointmentDateBetween(
                LocalDateTime.now().minusDays(7), LocalDateTime.now().plusDays(7));
        return ResponseEntity.ok(java.util.Map.of(
                "recentPatients", recentPatients,
                "recentAppointments", recentAppts
        ));
    }
}
