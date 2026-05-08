package com.lm.hospital.dto;

import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;

@Data
@Builder
public class LMDashboardStats {
    private long totalPatients;
    private long activePatients;
    private long criticalPatients;
    private long admittedPatients;
    private long todayAppointments;
    private long pendingAppointments;
    private long completedAppointments;
    private long totalDoctors;
    private long activeDoctors;
    private long totalStaff;
    private BigDecimal totalRevenue;
    private BigDecimal collectedRevenue;
    private long pendingBills;
    private long totalMedicalRecords;
}
