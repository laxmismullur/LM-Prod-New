package com.lm.hospital.controller;

import com.lm.hospital.dto.*;
import com.lm.hospital.model.LMUser;
import com.lm.hospital.repository.LMUserRepository;
import com.lm.hospital.security.LMJwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/lm/auth")
@CrossOrigin(origins = "*")
public class LMAuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private LMUserRepository userRepository;

    @Autowired
    private LMJwtUtils jwtUtils;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // 🔐 LOGIN
    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody LMLoginRequest loginRequest) {

        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getUsername(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        // 🔥 IMPORTANT FIX: use SAME identifier everywhere
        LMUser user = userRepository.findByUsername(loginRequest.getUsername())
                .or(() -> userRepository.findByEmail(loginRequest.getUsername()))
                .orElseThrow(() -> new RuntimeException("User not found"));

        String jwt = jwtUtils.generateJwtToken(authentication);

        return ResponseEntity.ok(new LMJwtResponse(
                jwt,
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getEmail(),
                user.getRole().name()
        ));
    }

    // 👤 CURRENT USER
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(Authentication authentication) {

        String username = authentication.getName();

        LMUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(user);
    }

    // 🔑 CHANGE PASSWORD
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(
            Authentication authentication,
            @RequestBody LMChangePasswordRequest request) {

        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            return ResponseEntity.badRequest().body("Passwords do not match");
        }

        LMUser user = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getOldPassword(), user.getPassword())) {
            return ResponseEntity.status(401).body("Old password is incorrect");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        return ResponseEntity.ok("Password changed successfully");
    }
}
