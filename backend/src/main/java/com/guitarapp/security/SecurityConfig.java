package com.guitarapp.security;

import com.guitarapp.exception.ErrorResponseWriter;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtService jwtService;
    private final ErrorResponseWriter errorResponseWriter;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;

    public SecurityConfig(JwtService jwtService,
                          ErrorResponseWriter errorResponseWriter,
                          RestAuthenticationEntryPoint authenticationEntryPoint) {
        this.jwtService = jwtService;
        this.errorResponseWriter = errorResponseWriter;
        this.authenticationEntryPoint = authenticationEntryPoint;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        // Filters are constructed here (not as beans) so they live only in this chain
        // and are not auto-registered with the servlet container for every request.
        JwtFilter jwtFilter = new JwtFilter(jwtService);
        RateLimitFilter rateLimitFilter = new RateLimitFilter(errorResponseWriter);

        http
            .csrf(AbstractHttpConfigurer::disable)
            // Picks up the CorsConfigurationSource bean (CorsConfig). CSRF stays disabled;
            // the credentialed cross-origin design is CORS-gated (see 3.4 deferred CSRF note).
            .cors(Customizer.withDefaults())
            .sessionManagement(s ->
                s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .httpBasic(AbstractHttpConfigurer::disable)
            .formLogin(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.POST,
                    "/api/v1/auth/register",
                    "/api/v1/auth/login",
                    "/api/v1/auth/google",
                    "/api/v1/auth/refresh",
                    "/api/v1/auth/logout").permitAll()
                .requestMatchers("/api/v1/health").permitAll()
                .anyRequest().authenticated()
            )
            .exceptionHandling(e -> e.authenticationEntryPoint(authenticationEntryPoint))
            .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(rateLimitFilter, JwtFilter.class);
        return http.build();
    }
}
