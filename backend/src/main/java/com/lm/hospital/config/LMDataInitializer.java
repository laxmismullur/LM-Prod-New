package com.lm.hospital.config;

import com.lm.hospital.model.*;
import com.lm.hospital.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Component
public class LMDataInitializer implements CommandLineRunner {

    @Autowired private LMUserRepository userRepository;
    @Autowired private LMDoctorRepository doctorRepository;
    @Autowired private LMPatientRepository patientRepository;
    @Autowired private LMAppointmentRepository appointmentRepository;
    @Autowired private LMMedicalRecordRepository medicalRecordRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        ensureAdminUser();
        seedDoctors();
        seedPatients();
        seedAppointments();
        seedMedicalRecords();
    }

    private void ensureAdminUser() {
        LMUser admin = userRepository.findByUsername("lm_admin")
                .or(() -> userRepository.findByEmail("admin@lmhospital.com"))
                .orElseGet(() -> LMUser.builder()
                        .username("lm_admin")
                        .fullName("Admin Kumar")
                        .email("admin@lmhospital.com")
                        .phone("+91-9876543210")
                        .role(LMRole.ADMIN)
                        .build());

        admin.setUsername("lm_admin");
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setFullName("Admin Kumar");
        admin.setEmail("admin@lmhospital.com");
        admin.setRole(LMRole.ADMIN);
        admin.setPhone("+91-9876543210");
        admin.setActive(true);

        userRepository.save(admin);
    }

    private void seedDoctors() {
        saveDoctorIfMissing(LMDoctor.builder()
                .doctorCode("LMD-001").fullName("Dr. Priya Sharma")
                .specialization("Cardiology").department("Cardiology")
                .qualification("MD, DM Cardiology").phone("+91-9876543211")
                .email("priya.sharma@lmhospital.com").experience("12 years")
                .consultationFee("800").availability("Mon-Fri 9AM-5PM")
                .active(true).build());

        saveDoctorIfMissing(LMDoctor.builder()
                .doctorCode("LMD-002").fullName("Dr. Rahul Verma")
                .specialization("Neurology").department("Neurology")
                .qualification("MD, DM Neurology").phone("+91-9876543212")
                .email("rahul.verma@lmhospital.com").experience("8 years")
                .consultationFee("1000").availability("Mon-Wed-Fri 10AM-4PM")
                .active(true).build());

        saveDoctorIfMissing(LMDoctor.builder()
                .doctorCode("LMD-003").fullName("Dr. Sunita Iyer")
                .specialization("Pediatrics").department("Pediatrics")
                .qualification("MD Pediatrics, PGPN").phone("+91-9876543215")
                .email("sunita.iyer@lmhospital.com").experience("6 years")
                .consultationFee("600").availability("Tue-Thu-Sat 9AM-3PM")
                .active(true).build());

        saveDoctorIfMissing(LMDoctor.builder()
                .doctorCode("LMD-004").fullName("Dr. Arjun Nair")
                .specialization("Orthopedics").department("Orthopedics")
                .qualification("MS Orthopedics, DNB").phone("+91-9876543216")
                .email("arjun.nair@lmhospital.com").experience("10 years")
                .consultationFee("900").availability("Mon-Fri 8AM-2PM")
                .active(true).build());
    }

    private void saveDoctorIfMissing(LMDoctor doctor) {
        if (!doctorRepository.existsByDoctorCode(doctor.getDoctorCode())
                && !doctorRepository.existsByEmail(doctor.getEmail())) {
            doctorRepository.save(doctor);
        }
    }

    private void seedPatients() {
        if (patientRepository.count() > 0) {
            return;
        }

        patientRepository.save(LMPatient.builder()
                .patientId("LMP-A1B2C3D4").fullName("Arjun Mehta")
                .dateOfBirth(LocalDate.of(1985, 3, 15)).gender("Male").bloodGroup("O+")
                .phone("+91-9123456789").email("arjun.mehta@email.com")
                .address("12, MG Road, Bengaluru").allergies("Penicillin")
                .status(LMPatientStatus.ACTIVE).assignedDoctorId(1L)
                .assignedDoctorName("Dr. Priya Sharma").assignedDoctorCode("LMD-001")
                .assignedDoctorSpecialization("Cardiology")
                .emergencyContact("+91-9123456700").build());

        patientRepository.save(LMPatient.builder()
                .patientId("LMP-E5F6G7H8").fullName("Sneha Patel")
                .dateOfBirth(LocalDate.of(1992, 7, 22)).gender("Female").bloodGroup("A+")
                .phone("+91-9234567890").email("sneha.patel@email.com")
                .address("45, Koramangala, Bengaluru").allergies("None")
                .status(LMPatientStatus.ADMITTED).assignedDoctorId(1L)
                .assignedDoctorName("Dr. Priya Sharma").assignedDoctorCode("LMD-001")
                .assignedDoctorSpecialization("Cardiology")
                .emergencyContact("+91-9234567800").build());

        patientRepository.save(LMPatient.builder()
                .patientId("LMP-I9J0K1L2").fullName("Vikram Nair")
                .dateOfBirth(LocalDate.of(1978, 11, 8)).gender("Male").bloodGroup("B-")
                .phone("+91-9345678901").email("vikram.nair@email.com")
                .address("78, Indiranagar, Bengaluru").allergies("Aspirin")
                .status(LMPatientStatus.CRITICAL).assignedDoctorId(2L)
                .assignedDoctorName("Dr. Rahul Verma").assignedDoctorCode("LMD-002")
                .assignedDoctorSpecialization("Neurology")
                .emergencyContact("+91-9345678900").build());

        patientRepository.save(LMPatient.builder()
                .patientId("LMP-M3N4O5P6").fullName("Meera Krishnan")
                .dateOfBirth(LocalDate.of(2000, 5, 30)).gender("Female").bloodGroup("AB+")
                .phone("+91-9456789012").email("meera.k@email.com")
                .address("23, Whitefield, Bengaluru").allergies("None")
                .status(LMPatientStatus.STABLE).assignedDoctorId(2L)
                .assignedDoctorName("Dr. Rahul Verma").assignedDoctorCode("LMD-002")
                .assignedDoctorSpecialization("Neurology")
                .emergencyContact("+91-9456789000").build());

        patientRepository.save(LMPatient.builder()
                .patientId("LMP-Q7R8S9T0").fullName("Ravi Gupta")
                .dateOfBirth(LocalDate.of(1965, 1, 18)).gender("Male").bloodGroup("O-")
                .phone("+91-9567890123").email("ravi.gupta@email.com")
                .address("5, HSR Layout, Bengaluru").allergies("Codeine")
                .status(LMPatientStatus.DISCHARGED).assignedDoctorId(1L)
                .assignedDoctorName("Dr. Priya Sharma").assignedDoctorCode("LMD-001")
                .assignedDoctorSpecialization("Cardiology")
                .emergencyContact("+91-9567890100").build());
    }

    private void seedAppointments() {
        if (appointmentRepository.count() > 0) {
            return;
        }

        appointmentRepository.save(LMAppointment.builder()
                .patientId(1L).patientName("Arjun Mehta")
                .doctorId(1L).doctorName("Dr. Priya Sharma").doctorCode("LMD-001")
                .department("Cardiology").specialization("Cardiology")
                .appointmentDate(LocalDateTime.now().plusHours(2))
                .reason("Follow-up checkup for hypertension")
                .status(LMAppointmentStatus.CONFIRMED).build());

        appointmentRepository.save(LMAppointment.builder()
                .patientId(2L).patientName("Sneha Patel")
                .doctorId(1L).doctorName("Dr. Priya Sharma").doctorCode("LMD-001")
                .department("Cardiology").specialization("Cardiology")
                .appointmentDate(LocalDateTime.now().plusHours(4))
                .reason("Chest discomfort").status(LMAppointmentStatus.SCHEDULED).build());

        appointmentRepository.save(LMAppointment.builder()
                .patientId(3L).patientName("Vikram Nair")
                .doctorId(2L).doctorName("Dr. Rahul Verma").doctorCode("LMD-002")
                .department("Neurology").specialization("Neurology")
                .appointmentDate(LocalDateTime.now().minusHours(3))
                .reason("Headache and dizziness").status(LMAppointmentStatus.COMPLETED)
                .doctorNotes("MRI ordered, follow up in 2 weeks.").build());

        appointmentRepository.save(LMAppointment.builder()
                .patientId(4L).patientName("Meera Krishnan")
                .doctorId(2L).doctorName("Dr. Rahul Verma").doctorCode("LMD-002")
                .department("Neurology").specialization("Neurology")
                .appointmentDate(LocalDateTime.now().plusDays(1))
                .reason("Knee pain review").status(LMAppointmentStatus.SCHEDULED).build());
    }

    private void seedMedicalRecords() {
        if (medicalRecordRepository.count() > 0) {
            return;
        }

        medicalRecordRepository.save(LMMedicalRecord.builder()
                .patientId(1L).patientName("Arjun Mehta")
                .doctorId(1L).doctorName("Dr. Priya Sharma")
                .diagnosis("Hypertension Stage 1")
                .vitals("BP: 145/90, HR: 82, Temp: 98.6°F, SpO2: 97%")
                .prescription("Amlodipine 5mg OD, Losartan 50mg OD")
                .notes("Patient advised to reduce salt and exercise regularly.")
                .labResults("CBC: Normal, Lipid Profile: Borderline")
                .followUpDate("2025-05-15").build());

        medicalRecordRepository.save(LMMedicalRecord.builder()
                .patientId(3L).patientName("Vikram Nair")
                .doctorId(2L).doctorName("Dr. Rahul Verma")
                .diagnosis("Migraine with Aura")
                .vitals("BP: 130/85, HR: 78, Temp: 98.4°F, SpO2: 99%")
                .prescription("Sumatriptan 50mg PRN, Propranolol 40mg BD")
                .notes("Advised to maintain headache diary. Avoid triggers.")
                .labResults("MRI Brain: No significant findings")
                .followUpDate("2025-05-01").build());
    }
}
