package com.lm.hospital.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.lm.hospital.model.Staff;
import java.util.List;

@Repository
public interface LMAddStaffRepository extends JpaRepository<Staff, Long> {

     List<Staff> findByRoleIgnoreCase(String role);
     boolean existsByUsername(String username);
     boolean existsByEmail(String email);
}
