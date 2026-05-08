package com.lm.hospital.repository;

import com.lm.hospital.model.LMUser;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface LMUserRepository extends JpaRepository<LMUser, Long> {
    Optional<LMUser> findByUsername(String username);
    Optional<LMUser> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
}
