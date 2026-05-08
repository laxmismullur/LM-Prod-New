package com.lm.hospital.repository;

import com.lm.hospital.model.LMDoctor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface LMDoctorRepository extends JpaRepository<LMDoctor, Long> {
    Optional<LMDoctor> findByDoctorCode(String doctorCode);
    Optional<LMDoctor> findByEmail(String email);
    Optional<LMDoctor> findByUserId(Long userId);
    Optional<LMDoctor> findByUsername(String username);
    List<LMDoctor> findByActiveTrue();
    List<LMDoctor> findBySpecializationContainingIgnoreCase(String specialization);
    List<LMDoctor> findByDepartmentContainingIgnoreCase(String department);
    List<LMDoctor> findByFullNameContainingIgnoreCase(String name);
    boolean existsByEmail(String email);
    boolean existsByDoctorCode(String doctorCode);
}
