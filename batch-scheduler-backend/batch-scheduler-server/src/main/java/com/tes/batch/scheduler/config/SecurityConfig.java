package com.tes.batch.scheduler.config;

import com.tes.batch.scheduler.security.JwtAccessDeniedHandler;
import com.tes.batch.scheduler.security.JwtAuthenticationEntryPoint;
import com.tes.batch.scheduler.security.JwtAuthenticationFilter;
import com.tes.batch.scheduler.security.MdcFilter;
import com.tes.batch.scheduler.security.RateLimitFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;
    private final JwtAccessDeniedHandler jwtAccessDeniedHandler;
    private final RateLimitFilter rateLimitFilter;
    private final MdcFilter mdcFilter;

    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public org.springframework.security.web.SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .anonymous(anonymous -> anonymous.principal("anonymousUser"))
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exception -> exception
                .authenticationEntryPoint(jwtAuthenticationEntryPoint)
                .accessDeniedHandler(jwtAccessDeniedHandler)
            )
            .authorizeHttpRequests(auth -> auth
                // Public endpoints - order matters!
                .requestMatchers(
                    "/user/login",
                    "/api/users/login",
                    "/actuator/health",
                    "/health",
                    "/error"
                ).permitAll()
                // Admin only endpoints - Actuator (except health)
                .requestMatchers("/actuator/**").hasRole("ADMIN")
                // Admin only endpoints - User management
                .requestMatchers("/user/create", "/user/delete", "/user/reset", "/user/update").hasRole("ADMIN")
                // Admin only endpoints - Server management
                .requestMatchers("/server/create", "/server/update", "/server/delete").hasRole("ADMIN")
                // Admin only endpoints - Group management
                .requestMatchers("/group/create", "/group/update", "/group/delete").hasRole("ADMIN")
                // Admin only endpoints - Job CUD
                .requestMatchers("/job/create", "/job/update", "/job/delete").hasRole("ADMIN")
                // Admin only endpoints - Workflow CUD
                .requestMatchers("/workflow/create", "/workflow/update", "/workflow/delete").hasRole("ADMIN")
                // SSE endpoints - permitAll (token validated via query param in JwtAuthenticationFilter)
                .requestMatchers("/api/logs/**").permitAll()
                // Authenticated endpoints - Logs and WebSocket
                .requestMatchers("/ws/**", "/logs/**").authenticated()
                // All other endpoints require authentication
                .anyRequest().authenticated()
            )
            // Register filters bottom-up: each filter must reference an already-registered filter
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(rateLimitFilter, JwtAuthenticationFilter.class)
            .addFilterBefore(mdcFilter, RateLimitFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // Use configured allowed origins instead of allowing all
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "Accept", "X-Requested-With", "X-Request-ID"));
        configuration.setExposedHeaders(Arrays.asList("Authorization", "X-Request-ID"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }
}
