package com.lm.hospital.repository;

import com.lm.hospital.model.LMMedicalRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LMMedicalRecordRepository extends JpaRepository<LMMedicalRecord, Long> {
    List<LMMedicalRecord> findByPatientIdOrderByRecordDateDesc(Long patientId);
    List<LMMedicalRecord> findByPatientIdInOrderByRecordDateDesc(List<Long> patientIds);
    List<LMMedicalRecord> findByDoctorId(Long doctorId);
    List<LMMedicalRecord> findByDoctorIdOrderByRecordDateDescIdDesc(Long doctorId);
    List<LMMedicalRecord> findAllByOrderByRecordDateDescIdDesc();
}
