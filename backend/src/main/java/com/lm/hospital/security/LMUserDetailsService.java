package com.lm.hospital.security;

import com.lm.hospital.model.LMUser;
import com.lm.hospital.repository.LMUserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;

@Service
public class LMUserDetailsService implements UserDetailsService {

    @Autowired
    private LMUserRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {

        LMUser user = userRepository.findByUsername(username)
                .or(() -> userRepository.findByEmail(username))
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));

        // ✅ FIX: normalize role to uppercase for Spring Security
        String role = user.getRole().name().toUpperCase();

        return new org.springframework.security.core.userdetails.User(
                user.getUsername(),
                user.getPassword(),
                user.isActive(),
                true,
                true,
                true,
                Collections.singletonList(
                        new SimpleGrantedAuthority("ROLE_" + role)
                )
        );
    }
}
