package com.lm.hospital.repository;

import com.lm.hospital.model.LMAppointment;
import com.lm.hospital.model.LMAppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.time.LocalDateTime;
import java.util.List;

public interface LMAppointmentRepository extends JpaRepository<LMAppointment, Long> {
    List<LMAppointment> findByDoctorId(Long doctorId);
    List<LMAppointment> findByPatientId(Long patientId);
    List<LMAppointment> findByPatientIdIn(List<Long> patientIds);
    List<LMAppointment> findByDoctorIdOrderByCreatedAtDescIdDesc(Long doctorId);
    List<LMAppointment> findByPatientIdOrderByCreatedAtDescIdDesc(Long patientId);
    List<LMAppointment> findByPatientIdInOrderByCreatedAtDescIdDesc(List<Long> patientIds);
    List<LMAppointment> findAllByOrderByCreatedAtDescIdDesc();
    List<LMAppointment> findByStatus(LMAppointmentStatus status);
    List<LMAppointment> findByAppointmentDateBetween(LocalDateTime start, LocalDateTime end);
    List<LMAppointment> findByDoctorIdAndAppointmentDateBetween(Long doctorId, LocalDateTime start, LocalDateTime end);
    List<LMAppointment> findByAppointmentDateAfterAndStatusNot(LocalDateTime date, LMAppointmentStatus status);
    List<LMAppointment> findByDoctorIdAndAppointmentDateAfterAndStatusNot(Long doctorId, LocalDateTime date, LMAppointmentStatus status);
    List<LMAppointment> findByPatientIdInAndAppointmentDateAfterAndStatusNot(List<Long> patientIds, LocalDateTime date, LMAppointmentStatus status);
    long countByStatus(LMAppointmentStatus status);
}
