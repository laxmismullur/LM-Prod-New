package com.lm.hospital.config;

import com.lm.hospital.security.LMAuthTokenFilter;
import com.lm.hospital.security.LMUserDetailsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class LMSecurityConfig {

    @Autowired
    private LMUserDetailsService userDetailsService;

    @Autowired
    private LMAuthTokenFilter authTokenFilter;

    // 🔐 Password Encoder
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // 🔐 Authentication Provider
    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setUserDetailsService(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder());
        return provider;
    }

    // 🔐 Authentication Manager
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    // 🌐 CORS CONFIG (React support)
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        config.setAllowedOriginPatterns(Arrays.asList(
                "http://localhost:*",
                "http://127.0.0.1:*"
        ));

        config.setAllowedMethods(Arrays.asList(
                "GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"
        ));

        config.setAllowedHeaders(Arrays.asList("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);

        return source;
    }

    // 🔐 SECURITY CONFIG
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {

        http
            // 🌐 CORS
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))

            // ❌ Disable CSRF (JWT system)
            .csrf(csrf -> csrf.disable())

            // 🧠 Stateless session (JWT)
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )

            // 🔐 AUTH RULES
            .authorizeHttpRequests(auth -> auth

                // ✅ PUBLIC APIs
                .requestMatchers(
                        "/api/auth/**",
                        "/api/lm/auth/**",
                        "/h2-console/**"
                ).permitAll()

                // 🔒 STAFF MODULE (SECURE - FIXED)
                .requestMatchers("/api/lm/staff/**").authenticated()

                // 🔒 DOCTORS
                .requestMatchers("/api/doctors/**").authenticated()

                // 🔒 PATIENTS
                .requestMatchers("/api/patients/**").authenticated()

                // 🔒 APPOINTMENTS
                .requestMatchers("/api/appointments/**").authenticated()

                // 🔒 BILLING
                .requestMatchers("/api/billing/**").authenticated()

                // 🔒 DEFAULT RULE
                .anyRequest().authenticated()
            )

            // 🧱 H2 Console support
            .headers(headers -> headers.frameOptions(frame -> frame.disable()))

            // 🔌 AUTH PROVIDER
            .authenticationProvider(authenticationProvider())

            // 🔐 JWT FILTER
            .addFilterBefore(authTokenFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
