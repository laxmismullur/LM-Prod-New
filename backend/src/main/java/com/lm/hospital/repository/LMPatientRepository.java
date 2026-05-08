package com.lm.hospital.repository;

import com.lm.hospital.model.LMPatient;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LMPatientRepository extends JpaRepository<LMPatient, Long> {
    Optional<LMPatient> findByPatientId(String patientId);
    Optional<LMPatient> findFirstByUserId(Long userId);
    Optional<LMPatient> findByEmail(String email);
    List<LMPatient> findByAssignedDoctorId(Long doctorId);
    List<LMPatient> findByUserId(Long userId);
    List<LMPatient> findByAssignedDoctorIdOrderByRegisteredAtDescIdDesc(Long doctorId);
    List<LMPatient> findByUserIdOrderByRegisteredAtDescIdDesc(Long userId);
    List<LMPatient> findAllByOrderByRegisteredAtDescIdDesc();
    List<LMPatient> findByFullNameContainingIgnoreCase(String name);
    long countByStatus(com.lm.hospital.model.LMPatientStatus status);
}
