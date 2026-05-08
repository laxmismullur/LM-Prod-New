package com.lm.hospital.controller;

import com.lm.hospital.model.Staff;
import com.lm.hospital.model.LMRole;
import com.lm.hospital.model.LMUser;
import com.lm.hospital.repository.LMAddStaffRepository;
import com.lm.hospital.repository.LMUserRepository;
import com.lm.hospital.service.LMEmailNotificationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/lm/staff")
@CrossOrigin(origins = "*", maxAge = 3600)
public class LMAddStaffController {

    @Autowired
    private LMAddStaffRepository repo;
    @Autowired
    private LMUserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private LMEmailNotificationService emailNotificationService;

    // =========================
    // CREATE STAFF (FIXED)
    // =========================
    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> save(@Valid @RequestBody Staff staff) {

        // ROLE NORMALIZATION
        staff.setRole(normalizeRole(staff.getRole()));

        if (staff.getUsername() == null || staff.getUsername().isBlank()) {
            return ResponseEntity.badRequest().body("Username is required");
        }
        if (staff.getPassword() == null || staff.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Password is required");
        }
        if (staff.getEmail() == null || staff.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body("Email is required");
        }
        if (!"NURSE".equals(staff.getRole()) && !"RECEPTIONIST".equals(staff.getRole())) {
            return ResponseEntity.badRequest().body("Staff registration supports NURSE and RECEPTIONIST roles");
        }
        if (userRepository.existsByUsername(staff.getUsername()) || repo.existsByUsername(staff.getUsername())) {
            return ResponseEntity.badRequest().body("Username already exists");
        }
        if (staff.getEmail() != null && !staff.getEmail().isBlank()
                && (userRepository.existsByEmail(staff.getEmail()) || repo.existsByEmail(staff.getEmail()))) {
            return ResponseEntity.badRequest().body("Email already exists");
        }

        // ✅ FIX 1: Handle specialization properly
        if ("RECEPTIONIST".equals(staff.getRole())) {
            staff.setSpecialization(null);
        }

        String plainPassword = staff.getPassword();

        LMUser savedUser = userRepository.save(LMUser.builder()
                .username(staff.getUsername().trim())
                .password(passwordEncoder.encode(plainPassword))
                .fullName(staff.getFullName())
                .email(staff.getEmail())
                .phone(staff.getPhone())
                .role(LMRole.valueOf(staff.getRole()))
                .active(staff.isActive())
                .build());

        staff.setPassword(null);
        Staff savedStaff = repo.save(staff);
        sendStaffCredentialsEmail(savedStaff, savedUser.getUsername(), plainPassword);

        return ResponseEntity.ok(java.util.Map.of(
                "staff", savedStaff,
                "userId", savedUser.getId(),
                "username", savedUser.getUsername()
        ));
    }

    private void sendStaffCredentialsEmail(Staff staff, String loginUsername, String plainPassword) {
        if (staff == null || staff.getEmail() == null || staff.getEmail().isBlank()
                || loginUsername == null || loginUsername.isBlank()
                || plainPassword == null || plainPassword.isBlank()) {
            System.err.println("Staff credentials email skipped because email, username, or password is missing. Staff ID: "
                    + (staff != null ? staff.getId() : null));
            return;
        }

        String roleLabel = "RECEPTIONIST".equals(staff.getRole()) ? "Receptionist" : "Nurse";
        emailNotificationService.sendLoginCredentialsEmail(
                staff.getEmail(),
                staff.getFullName(),
                roleLabel,
                loginUsername,
                plainPassword
        );
    }

    // =========================
    // GET ALL STAFF
    // =========================
    @GetMapping
    public List<Staff> getAll() {
        return repo.findAll();
    }

    // =========================
    // GET BY ID
    // =========================
    @GetMapping("/{id}")
    public ResponseEntity<Staff> getById(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // =========================
    // GET BY ROLE
    // =========================
    @GetMapping("/role/{role}")
    public List<Staff> getByRole(@PathVariable String role) {

        if (role != null) {
            role = role.toUpperCase();

            if (role.equals("ROLE_NURSE")) {
                role = "NURSE";
            } else if (role.equals("ROLE_RECEPTIONIST")) {
                role = "RECEPTIONIST";
            }
        }

        return repo.findByRoleIgnoreCase(role);
    }

    // =========================
    // UPDATE STAFF (FULL FIX)
    // =========================
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> update(@PathVariable Long id, @Valid @RequestBody Staff staff) {

        return repo.findById(id).map(existing -> {
            String oldUsername = existing.getUsername();
            String oldEmail = existing.getEmail();
            String username = staff.getUsername();
            if (username != null && !username.isBlank()) {
                var duplicateStaff = repo.findAll().stream()
                        .filter(s -> username.trim().equalsIgnoreCase(s.getUsername()))
                        .filter(s -> !s.getId().equals(id))
                        .findFirst();
                if (duplicateStaff.isPresent()) {
                    return ResponseEntity.badRequest().body("Username already exists");
                }

                var duplicateUser = userRepository.findByUsername(username.trim());
                if (duplicateUser.isPresent() && !username.trim().equalsIgnoreCase(existing.getUsername())) {
                    return ResponseEntity.badRequest().body("Username already exists");
                }
            }

            if (staff.getEmail() != null && !staff.getEmail().isBlank()) {
                var duplicateStaffEmail = repo.findAll().stream()
                        .filter(s -> staff.getEmail().equalsIgnoreCase(s.getEmail()))
                        .filter(s -> !s.getId().equals(id))
                        .findFirst();
                if (duplicateStaffEmail.isPresent()) {
                    return ResponseEntity.badRequest().body("Email already exists");
                }
            }

            String requestedRole = normalizeRole(staff.getRole());
            String changes = buildStaffChangeDetails(existing, staff, requestedRole);
            if (username != null && !username.isBlank()) {
                existing.setUsername(username.trim());
            }

            // BASIC FIELDS
            existing.setFullName(staff.getFullName());
            existing.setEmail(staff.getEmail());
            existing.setPhone(staff.getPhone());
            existing.setDepartment(staff.getDepartment());
            existing.setActive(staff.isActive());

            // ✅ FIX 2: SAVE SPECIALIZATION
            existing.setSpecialization(staff.getSpecialization());

            // ROLE NORMALIZATION
            existing.setRole(requestedRole);

            // ✅ FIX 3: REMOVE specialization for receptionist
            if ("RECEPTIONIST".equals(existing.getRole())) {
                existing.setSpecialization(null);
            }

            syncStaffUser(existing, oldUsername, oldEmail, staff.getPassword());
            Staff savedStaff = repo.save(existing);
            boolean emailSent = sendStaffUpdateEmail(savedStaff, changes, staff.getPassword());
            return ResponseEntity.ok(Map.of(
                    "staff", savedStaff,
                    "emailSent", emailSent
            ));

        }).orElse(ResponseEntity.notFound().build());
    }

    private String buildStaffChangeDetails(Staff existing, Staff updated, String requestedRole) {
        StringBuilder changes = new StringBuilder();
        appendChange(changes, "Full Name", existing.getFullName(), updated.getFullName());
        appendChange(changes, "Username", existing.getUsername(), updated.getUsername());
        appendChange(changes, "Email", existing.getEmail(), updated.getEmail());
        appendChange(changes, "Phone", existing.getPhone(), updated.getPhone());
        appendChange(changes, "Department", existing.getDepartment(), updated.getDepartment());
        appendChange(changes, "Specialization", existing.getSpecialization(), updated.getSpecialization());
        appendChange(changes, "Role", existing.getRole(), requestedRole);
        appendChange(changes, "Active", String.valueOf(existing.isActive()), String.valueOf(updated.isActive()));
        if (updated.getPassword() != null && !updated.getPassword().isBlank()) {
            changes.append("- Password: Updated\n");
        }
        return changes.length() == 0 ? "- Profile reviewed and saved by admin.\n" : changes.toString();
    }

    private void appendChange(StringBuilder changes, String label, Object oldValue, Object newValue) {
        if (!Objects.equals(cleanValue(oldValue), cleanValue(newValue))) {
            changes.append("- ")
                    .append(label)
                    .append(": ")
                    .append(displayValue(oldValue))
                    .append(" -> ")
                    .append(displayValue(newValue))
                    .append("\n");
        }
    }

    private String cleanValue(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String displayValue(Object value) {
        String text = cleanValue(value);
        return text.isBlank() ? "-" : text;
    }

    private boolean sendStaffUpdateEmail(Staff staff, String changes, String newPlainPassword) {
        String roleLabel = "RECEPTIONIST".equals(staff.getRole()) ? "Receptionist" : "Nurse";
        return emailNotificationService.sendProfileUpdateEmail(
                staff.getEmail(),
                staff.getFullName(),
                roleLabel,
                changes,
                staff.getUsername(),
                newPlainPassword
        );
    }

    private void syncStaffUser(Staff staff, String oldUsername, String oldEmail, String rawPassword) {
        if (staff.getUsername() == null || staff.getUsername().isBlank()) {
            return;
        }

        LMUser user = oldUsername != null ? userRepository.findByUsername(oldUsername).orElse(null) : null;
        if (user == null && oldEmail != null) {
            user = userRepository.findByEmail(oldEmail).orElse(null);
        }
        if (user == null) {
            user = userRepository.findByUsername(staff.getUsername()).orElse(null);
        }
        if (user == null && staff.getEmail() != null) {
            user = userRepository.findByEmail(staff.getEmail()).orElse(null);
        }
        if (user == null) {
            return;
        }

        user.setUsername(staff.getUsername().trim());
        user.setFullName(staff.getFullName());
        user.setEmail(staff.getEmail());
        user.setPhone(staff.getPhone());
        user.setRole(LMRole.valueOf(staff.getRole()));
        user.setActive(staff.isActive());
        if (rawPassword != null && !rawPassword.isBlank()) {
            user.setPassword(passwordEncoder.encode(rawPassword));
        }
        userRepository.save(user);
    }

    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Staff> toggleActive(@PathVariable Long id) {
        return repo.findById(id).map(staff -> {
            staff.setActive(!staff.isActive());
            userRepository.findByUsername(staff.getUsername()).ifPresent(user -> {
                user.setActive(staff.isActive());
                userRepository.save(user);
            });
            return ResponseEntity.ok(repo.save(staff));
        }).orElse(ResponseEntity.notFound().build());
    }

    // =========================
    // DELETE STAFF
    // =========================
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> delete(@PathVariable Long id) {

        return repo.findById(id).map(staff -> {
            repo.delete(staff);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }

    private String normalizeRole(String role) {
        if (role == null) return null;
        role = role.toUpperCase();

        if (role.equals("ROLE_NURSE")) {
            return "NURSE";
        } else if (role.equals("ROLE_RECEPTIONIST")) {
            return "RECEPTIONIST";
        }

        return role;
    }
}
