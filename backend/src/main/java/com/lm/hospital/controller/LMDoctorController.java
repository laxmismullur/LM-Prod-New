package com.lm.hospital.controller;

import com.lm.hospital.model.LMDoctor;
import com.lm.hospital.model.LMUser;
import com.lm.hospital.model.LMRole;
import com.lm.hospital.dto.LMDoctorLoginCredentials;
import com.lm.hospital.repository.LMDoctorRepository;
import com.lm.hospital.repository.LMUserRepository;
import com.lm.hospital.service.LMEmailNotificationService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@RestController
@RequestMapping("/api/lm/doctors")
@CrossOrigin(origins = "*", maxAge = 3600)
public class LMDoctorController {

    @Autowired
    private LMDoctorRepository doctorRepository;

    @Autowired
    private LMUserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private LMEmailNotificationService emailNotificationService;

    @GetMapping
    public List<LMDoctor> getAllDoctors() {
        return doctorRepository.findAll();
    }

    @GetMapping("/active")
    public List<LMDoctor> getActiveDoctors() {
        return doctorRepository.findByActiveTrue();
    }

    @GetMapping("/profile")
    @PreAuthorize("hasRole('DOCTOR')")
    public ResponseEntity<LMDoctor> getMyProfile(Authentication authentication) {
        LMUser user = getCurrentUser(authentication);
        return doctorRepository.findByUserId(user.getId())
                .or(() -> doctorRepository.findByEmail(user.getEmail()))
                .or(() -> doctorRepository.findByUsername(user.getUsername()))
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/{id}")
    public ResponseEntity<LMDoctor> getDoctorById(@PathVariable Long id) {
        return doctorRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/search")
    public List<LMDoctor> searchDoctors(@RequestParam String name) {
        return doctorRepository.findByFullNameContainingIgnoreCase(name);
    }

    @GetMapping("/department/{dept}")
    public List<LMDoctor> getByDepartment(@PathVariable String dept) {
        return doctorRepository.findByDepartmentContainingIgnoreCase(dept);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> createDoctor(@Valid @RequestBody LMDoctor doctor) {
        if (doctor.getEmail() != null && doctorRepository.existsByEmail(doctor.getEmail())) {
            return ResponseEntity.badRequest().body("Email already registered");
        }
        
        if (doctor.getUsername() == null || doctor.getUsername().isBlank()) {
            return ResponseEntity.badRequest().body("Username is required");
        }
        if (doctor.getPassword() == null || doctor.getPassword().isBlank()) {
            return ResponseEntity.badRequest().body("Password is required");
        }
        if (doctor.getEmail() == null || doctor.getEmail().isBlank()) {
            return ResponseEntity.badRequest().body("Email is required");
        }
        if (userRepository.existsByUsername(doctor.getUsername())) {
            return ResponseEntity.badRequest().body("Username already exists");
        }
        if (doctor.getEmail() != null && userRepository.existsByEmail(doctor.getEmail())) {
            return ResponseEntity.badRequest().body("Email already registered as a login user");
        }

        String loginUsername = doctor.getUsername().trim();
        String plainPassword = doctor.getPassword();

        // Generate unique doctor code
        doctor.setDoctorCode("LMD-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        
        // Save doctor
        LMDoctor savedDoctor = doctorRepository.save(doctor);
        
        // Create a corresponding user account for the doctor
        String username = createDoctorUser(savedDoctor, loginUsername, plainPassword);
        boolean emailSent = sendDoctorCredentialsEmail(savedDoctor, username, plainPassword);
        savedDoctor.setPassword(null);
        
        // Return response with doctor info and login credentials
        Map<String, Object> response = new HashMap<>();
        response.put("doctor", savedDoctor);
        response.put("emailSent", emailSent);
        response.put("loginCredentials", new LMDoctorLoginCredentials(
                savedDoctor.getId(),
                savedDoctor.getFullName(),
                username,
                "Password set by admin",
                "Doctor account created successfully. Login credentials were sent to the doctor's email."
        ));
        
        return ResponseEntity.ok(response);
    }

    /**
     * Creates a user account for a doctor with admin-provided credentials.
     * Returns the generated username
     */
    private String createDoctorUser(LMDoctor doctor, String requestedUsername, String rawPassword) {
        try {
            String username = requestedUsername.trim();
            
            // Create user account with default password
            LMUser doctorUser = LMUser.builder()
                    .username(username)
                    .password(passwordEncoder.encode(rawPassword))
                    .fullName(doctor.getFullName())
                    .email(doctor.getEmail())
                    .phone(doctor.getPhone())
                    .role(LMRole.DOCTOR)
                    .active(true)
                    .build();
            
            LMUser savedUser = userRepository.save(doctorUser);
            
            // Update doctor record with userId and username
            doctor.setUserId(savedUser.getId());
            doctor.setUsername(username);
            doctorRepository.save(doctor);
            
            return username;
            
        } catch (Exception e) {
            // Log error but don't fail doctor creation if user creation fails
            System.err.println("Failed to create user account for doctor: " + e.getMessage());
            return null;
        }
    }

    private boolean sendDoctorCredentialsEmail(LMDoctor doctor, String loginUsername, String plainPassword) {
        if (doctor == null || doctor.getEmail() == null || doctor.getEmail().isBlank()
                || loginUsername == null || loginUsername.isBlank()
                || plainPassword == null || plainPassword.isBlank()) {
            System.err.println("Doctor credentials email skipped because email, username, or password is missing. Doctor ID: "
                    + (doctor != null ? doctor.getId() : null));
            return false;
        }

        return emailNotificationService.sendLoginCredentialsEmail(
                doctor.getEmail(),
                doctor.getFullName(),
                "Doctor",
                loginUsername,
                plainPassword
        );
    }

    private LMUser getCurrentUser(Authentication authentication) {
        return userRepository.findByUsername(authentication.getName())
                .orElseGet(() -> userRepository.findByEmail(authentication.getName())
                        .orElseThrow(() -> new RuntimeException("User not found")));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateDoctor(@PathVariable Long id, @Valid @RequestBody LMDoctor doctor) {
        return doctorRepository.findById(id).map(existing -> {
            if (doctor.getEmail() != null && !doctor.getEmail().isBlank()) {
                var duplicateDoctor = doctorRepository.findByEmail(doctor.getEmail());
                if (duplicateDoctor.isPresent() && !duplicateDoctor.get().getId().equals(id)) {
                    return ResponseEntity.badRequest().body("Email already registered");
                }
            }

            String requestedUsername = doctor.getUsername();
            if (requestedUsername != null && !requestedUsername.isBlank()) {
                var duplicateUser = userRepository.findByUsername(requestedUsername.trim());
                if (duplicateUser.isPresent()
                        && (existing.getUserId() == null || !duplicateUser.get().getId().equals(existing.getUserId()))) {
                    return ResponseEntity.badRequest().body("Username already exists");
                }
            }

            String changes = buildDoctorChangeDetails(existing, doctor);
            if (requestedUsername != null && !requestedUsername.isBlank()) {
                existing.setUsername(requestedUsername.trim());
            }

            existing.setFullName(doctor.getFullName());
            existing.setSpecialization(doctor.getSpecialization());
            existing.setDepartment(doctor.getDepartment());
            existing.setQualification(doctor.getQualification());
            existing.setPhone(doctor.getPhone());
            existing.setEmail(doctor.getEmail());
            existing.setExperience(doctor.getExperience());
            existing.setConsultationFee(doctor.getConsultationFee());
            existing.setAvailability(doctor.getAvailability());
            existing.setAddress(doctor.getAddress());
            existing.setActive(doctor.isActive());

            syncDoctorUser(existing, doctor.getPassword());
            LMDoctor savedDoctor = doctorRepository.save(existing);
            boolean emailSent = sendDoctorUpdateEmail(savedDoctor, changes, doctor.getPassword());

            Map<String, Object> response = new HashMap<>();
            response.put("doctor", savedDoctor);
            response.put("emailSent", emailSent);
            return ResponseEntity.ok(response);
        }).orElse(ResponseEntity.notFound().build());
    }

    private String buildDoctorChangeDetails(LMDoctor existing, LMDoctor updated) {
        StringBuilder changes = new StringBuilder();
        appendChange(changes, "Full Name", existing.getFullName(), updated.getFullName());
        appendChange(changes, "Specialization", existing.getSpecialization(), updated.getSpecialization());
        appendChange(changes, "Department", existing.getDepartment(), updated.getDepartment());
        appendChange(changes, "Qualification", existing.getQualification(), updated.getQualification());
        appendChange(changes, "Phone", existing.getPhone(), updated.getPhone());
        appendChange(changes, "Email", existing.getEmail(), updated.getEmail());
        appendChange(changes, "Experience", existing.getExperience(), updated.getExperience());
        appendChange(changes, "Consultation Fee", existing.getConsultationFee(), updated.getConsultationFee());
        appendChange(changes, "Availability", existing.getAvailability(), updated.getAvailability());
        appendChange(changes, "Address", existing.getAddress(), updated.getAddress());
        appendChange(changes, "Username", existing.getUsername(), updated.getUsername());
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

    private boolean sendDoctorUpdateEmail(LMDoctor doctor, String changes, String newPlainPassword) {
        return emailNotificationService.sendProfileUpdateEmail(
                doctor.getEmail(),
                doctor.getFullName(),
                "Doctor",
                changes,
                doctor.getUsername(),
                newPlainPassword
        );
    }

    private void syncDoctorUser(LMDoctor doctor, String rawPassword) {
        LMUser user = null;
        if (doctor.getUserId() != null) {
            user = userRepository.findById(doctor.getUserId()).orElse(null);
        }
        if (user == null && doctor.getUsername() != null) {
            user = userRepository.findByUsername(doctor.getUsername()).orElse(null);
        }
        if (user == null || doctor.getUsername() == null || doctor.getUsername().isBlank()) {
            return;
        }

        user.setUsername(doctor.getUsername().trim());
        user.setFullName(doctor.getFullName());
        user.setEmail(doctor.getEmail());
        user.setPhone(doctor.getPhone());
        user.setActive(doctor.isActive());
        if (rawPassword != null && !rawPassword.isBlank()) {
            user.setPassword(passwordEncoder.encode(rawPassword));
        }
        LMUser savedUser = userRepository.save(user);
        doctor.setUserId(savedUser.getId());
    }

    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<LMDoctor> toggleActive(@PathVariable Long id) {
        return doctorRepository.findById(id).map(d -> {
            d.setActive(!d.isActive());
            return ResponseEntity.ok(doctorRepository.save(d));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteDoctor(@PathVariable Long id) {
        return doctorRepository.findById(id).map(d -> {
            doctorRepository.delete(d);
            return ResponseEntity.ok().build();
        }).orElse(ResponseEntity.notFound().build());
    }
}
